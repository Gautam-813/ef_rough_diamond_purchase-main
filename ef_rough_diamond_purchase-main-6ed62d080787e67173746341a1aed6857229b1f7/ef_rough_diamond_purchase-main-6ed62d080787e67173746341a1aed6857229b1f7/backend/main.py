from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
import uvicorn
import models, schemas, auth_utils
from database import engine, get_db
from datetime import timedelta
import datetime
import pandas as pd
from typing import List, Dict, Any
import os
import shutil


# Create uploads directory if it doesn't exist
UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

app = FastAPI(
    title="EF Diamond ERP API",
    description="Backend for EF Rough Diamond Purchase Dashboard",
    version="1.0.0"
)

# --- CORS CONFIGURATION ---
# This allows your frontend (Port 5173) to securely talk to the backend (Port 8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, change this to your specific URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create a default admin user if none exists
def create_initial_admin():
    db = next(get_db())
    admin = db.query(models.User).filter(models.User.role == models.UserRole.ADMIN).first()
    if not admin:
        hashed_pwd = auth_utils.get_password_hash("admin123")
        new_admin = models.User(
            email="admin@efdiamond.com",
            hashed_password=hashed_pwd,
            role=models.UserRole.ADMIN
        )
        db.add(new_admin)
        db.commit()
        print("Default Admin Created: admin@efdiamond.com / admin123")

# --- STARTUP EVENT ---
@app.on_event("startup")
async def startup_event():
    print("Starting up EF Diamond ERP...")
    try:
        # Create the database tables on startup
        models.Base.metadata.create_all(bind=engine)
        print("Database tables verified.")
        
        # Create initial admin
        create_initial_admin()
        print("Initial admin check complete.")
    except Exception as e:
        print(f"CRITICAL ERROR DURING STARTUP: {e}")
        # In production, we might want to log this to an external service

# create_initial_admin() - Called by startup_event

# OAuth2 setup
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# --- Dependency: Get Current User ---
async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    payload = auth_utils.decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    email: str = payload.get("sub")
    if email is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user

# --- AUTH ROUTES ---

@app.post("/auth/signup", response_model=schemas.UserOut)
def signup(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_pwd = auth_utils.get_password_hash(user.password)
    new_user = models.User(
        email=user.email,
        hashed_password=hashed_pwd,
        role=user.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/auth/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not auth_utils.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = auth_utils.create_access_token(
        data={"sub": user.email, "role": user.role}
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/auth/me", response_model=schemas.UserOut)
async def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user

# --- Dependency: Require Admin ---
async def require_admin(current_user: models.User = Depends(get_current_user)):
    if current_user.role != models.UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation restricted to Super Admin only"
        )
    return current_user

# --- ADMIN ROUTES (User Management) ---

@app.get("/admin/users", response_model=List[schemas.UserOut])
def list_users(db: Session = Depends(get_db), admin: models.User = Depends(require_admin)):
    return db.query(models.User).all()

@app.put("/admin/users/{user_id}/role")
def update_user_role(user_id: int, role: str, db: Session = Depends(get_db), admin: models.User = Depends(require_admin)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = role
    db.commit()
    return {"message": f"User {user_id} role updated to {role}"}

@app.delete("/admin/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), admin: models.User = Depends(require_admin)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}

@app.put("/admin/users/{user_id}/password")
def update_user_password(user_id: int, data: Dict[str, str], db: Session = Depends(get_db), admin: models.User = Depends(require_admin)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_password = data.get("password")
    if not new_password or len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
        
    user.hashed_password = auth_utils.get_password_hash(new_password)
    db.commit()
    return {"message": f"Password for user {user.email} has been reset"}

# --- USER CONFIG / MASTER FILE ROUTES ---

@app.get("/config/me")
def get_my_config(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    config = db.query(models.MasterConfig).filter(models.MasterConfig.user_id == current_user.id).first()
    if not config:
        # Create default config if none exists for this user
        config = models.MasterConfig(user_id=current_user.id)
        db.add(config)
        db.commit()
        db.refresh(config)
    return config

@app.put("/config/me")
def update_my_config(data: Dict[str, Any], current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    config = db.query(models.MasterConfig).filter(models.MasterConfig.user_id == current_user.id).first()
    if not config:
        config = models.MasterConfig(user_id=current_user.id)
        db.add(config)
    
    # Update fields dynamically
    for key, value in data.items():
        if hasattr(config, key):
            setattr(config, key, value)
    
    db.commit()
    return {"status": "success", "message": "Master preferences updated"}

@app.post("/config/sync-excel")
async def sync_prices_from_excel(
    file: UploadFile = File(...), 
    current_user: models.User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    try:
        # Load the uploaded Excel file
        df = pd.read_excel(file.file, sheet_name=0, header=None)
        
        # Define our targets
        price_lists = {"Round": {}, "Fancy": {}}
        
        # Consistent data keys
        colors = ["DEF", "G", "H", "I", "J", "K", "L", "M", "CAPE"]
        clarities = ["VVS", "VS1", "VS2", "SI1", "SI2", "I1", "I2"]
        
        # Column offsets from the start of each block (Color col is +0)
        # Based on Final-Price-Template.xlsx: VVS is +1, VS1 is +2, VS2 is +3, SI1 is +4, SI2 is +5, I1 is +6, I2 is +7
        clarity_col_mapping = {
            "VVS": 1, "VS1": 2, "VS2": 3, "SI1": 4, "SI2": 5, "I1": 6, "I2": 7
        }
        
        # Mapping of weight labels to our r1-r8 IDs
        range_mapping = {
            "0.002-0.004": "r1",
            "0.005-0.008": "r2",
            "0.009-0.021": "r3",
            "0.022-0.051": "r4",
            "0.052-0.077": "r5",
            "0.078-0.115": "r6",
            "0.116-0.158": "r7",
            "0.159-0.18": "r8",
            "0.19-0.22": "r9",
            "0.23-0.29": "r10",
            "0.30-0.39": "r11",
            "0.40-0.49": "r12",
            "0.50-0.69": "r13",
            "0.70-0.89": "r14",
            "0.90-0.99": "r15",
            "1.00-1.49": "r16"
        }

        def extract_block(start_row, shape_col_offset):
            block = {}
            # Scan the next 20 rows to find all matching colors
            for offset in range(1, 20):
                row_idx = start_row + offset
                if row_idx >= len(df): break
                
                # Get the row label (Color) from the first column of the block
                row_label = str(df.iloc[row_idx, shape_col_offset]).strip().upper()
                if not row_label or row_label == 'NAN': continue

                # Match against our standard color list
                matched_color = None
                for color in colors:
                    # Match exact or handle CAPE / DEF labels
                    if color == row_label or (color == "CAPE" and "CAPE" in row_label) or (color == "DEF" and "DEF" in row_label):
                        matched_color = color
                        break
                
                if matched_color:
                    block[matched_color] = {}
                    for clarity in clarities:
                        c_offset = clarity_col_mapping.get(clarity)
                        col_idx = shape_col_offset + c_offset
                        try:
                            val = df.iloc[row_idx, col_idx]
                            # Clean the value (handle strings with commas or symbols)
                            if isinstance(val, str):
                                val = val.replace(',', '').replace('$', '').strip()
                            block[matched_color][clarity] = round(float(val), 2) if pd.notnull(val) else 0
                        except:
                            block[matched_color][clarity] = 0
            return block

        # Find where ranges start by scanning the description column (usually Column B/Index 1)
        for row_idx in range(len(df)):
            cell_val = str(df.iloc[row_idx, 1]).strip()
            for label, r_id in range_mapping.items():
                if label in cell_val:
                    # Round block (Starts at Col A/0)
                    price_lists["Round"][r_id] = extract_block(row_idx, 0)
                    # Fancy block (Starts at Col K/10)
                    price_lists["Fancy"][r_id] = extract_block(row_idx, 10)

        # Save to DB
        config = db.query(models.MasterConfig).filter(models.MasterConfig.user_id == current_user.id).first()
        if not config:
            config = models.MasterConfig(user_id=current_user.id)
            db.add(config)
        
        config.price_overrides = price_lists
        db.commit()
        
        return {"status": "success", "message": "Prices uploaded and synchronized successfully", "data": price_lists}

    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error parsing Excel: {str(e)}")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error parsing Excel: {str(e)}")

# --- TENDER / NOTEBOOK ROUTES ---

# --- MEDIA / UPLOAD ROUTES ---

@app.delete("/media/{media_id}")
def delete_media(media_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    media = db.query(models.Media).join(models.Parcel).join(models.Tender).filter(
        models.Media.id == media_id,
        models.Tender.owner_id == current_user.id
    ).first()
    
    if not media:
        raise HTTPException(status_code=404, detail="Media not found or unauthorized")
    
    # Delete physical file
    try:
        # Convert web path static/filename to local path uploads/filename
        filename = media.file_path.split("/")[-1]
        local_path = os.path.join(UPLOAD_DIR, filename)
        if os.path.exists(local_path):
            os.remove(local_path)
    except Exception as e:
        print(f"Error deleting file: {e}")

    db.delete(media)
    db.commit()
    return {"message": "Media deleted"}

@app.post("/tenders/{tender_id}/share")
def share_tender(tender_id: int, email: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Verify owner
    tender = db.query(models.Tender).filter(models.Tender.id == tender_id, models.Tender.owner_id == current_user.id).first()
    if not tender:
        raise HTTPException(status_code=404, detail="Notebook not found")
    
    # Verify target user exists
    target_user = db.query(models.User).filter(models.User.email == email).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User with this email not found in database")
    
    # Prevent sharing with self
    if target_user.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot share with yourself")

    # Create share
    share = models.TenderShare(tender_id=tender_id, user_id=target_user.id)
    db.add(share)
    db.commit()
    return {"status": "success", "message": f"Notebook shared with {email}"}

# Update get_my_tenders to include SHARED notebooks
@app.get("/tenders", response_model=List[schemas.TenderOut])
def get_my_tenders(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    owned = db.query(models.Tender).filter(models.Tender.owner_id == current_user.id).all()
    shared = db.query(models.Tender).join(models.TenderShare).filter(models.TenderShare.user_id == current_user.id).all()
    return owned + shared

@app.post("/tenders", response_model=schemas.TenderOut)
def create_tender(tender: schemas.TenderCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    new_tender = models.Tender(**tender.dict(), owner_id=current_user.id)
    db.add(new_tender)
    db.commit()
    db.refresh(new_tender)
    return new_tender

@app.delete("/tenders/{tender_id}")
def delete_tender(tender_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    tender = db.query(models.Tender).filter(models.Tender.id == tender_id, models.Tender.owner_id == current_user.id).first()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found or unauthorized")
    db.delete(tender)
    db.commit()
    return {"message": "Tender and all associated parcels deleted"}

@app.put("/tenders/{tender_id}", response_model=schemas.TenderOut)
def update_tender(tender_id: int, tender_data: Dict[str, Any], db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    tender = db.query(models.Tender).filter(models.Tender.id == tender_id, models.Tender.owner_id == current_user.id).first()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found or unauthorized")
    
    # Robust update: only update direct columns
    allowed_keys = ["name", "date", "viewing_date"]
    for key, value in tender_data.items():
        if key in allowed_keys:
            setattr(tender, key, value)
    
    db.commit()
    db.refresh(tender)
    return tender

# --- PARCEL ROUTES ---

@app.post("/tenders/{tender_id}/parcels", response_model=schemas.ParcelOut)
def create_parcel(tender_id: int, parcel: schemas.ParcelCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    tender = db.query(models.Tender).filter(models.Tender.id == tender_id, models.Tender.owner_id == current_user.id).first()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found or unauthorized")
    
    new_parcel = models.Parcel(**parcel.dict(), tender_id=tender_id)
    db.add(new_parcel)
    db.commit()
    db.refresh(new_parcel)
    return new_parcel

@app.put("/parcels/{parcel_id}", response_model=schemas.ParcelOut)
def update_parcel(parcel_id: int, parcel_data: Dict[str, Any], db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    parcel = db.query(models.Parcel).join(models.Tender).filter(
        models.Parcel.id == parcel_id, 
        models.Tender.owner_id == current_user.id
    ).first()
    
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found or unauthorized")
    
    # Robust update: only update direct columns
    allowed_keys = ["number", "name", "parcel_type", "total_cts", "pcs", "last_sold_price", "bid_price_per_ct", "profit_margin", "calc_state"]
    for key, value in parcel_data.items():
        if key in allowed_keys:
            setattr(parcel, key, value)
    
    db.commit()
    db.refresh(parcel)
    return parcel

@app.delete("/parcels/{parcel_id}")
def delete_parcel(parcel_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    parcel = db.query(models.Parcel).join(models.Tender).filter(
        models.Parcel.id == parcel_id, 
        models.Tender.owner_id == current_user.id
    ).first()
    
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found or unauthorized")
    
    db.delete(parcel)
    db.commit()
    return {"message": "Parcel deleted successfully"}

# Mount static files
app.mount("/static", StaticFiles(directory=UPLOAD_DIR), name="static")

# --- MEDIA / UPLOAD ROUTES ---

@app.post("/parcels/{parcel_id}/upload")
async def upload_media(
    parcel_id: int, 
    file: UploadFile = File(...), 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    parcel = db.query(models.Parcel).join(models.Tender).filter(
        models.Parcel.id == parcel_id, 
        models.Tender.owner_id == current_user.id
    ).first()
    
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found or unauthorized")
    
    file_ext = file.filename.split(".")[-1]
    filename = f"parcel_{parcel_id}_{datetime.datetime.now().timestamp()}.{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    f_type = "image"
    if file_ext.lower() in ["mp4", "mov", "avi"]: f_type = "video"
    elif file_ext.lower() == "pdf": f_type = "pdf"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    new_media = models.Media(
        filename=file.filename,
        file_type=f_type,
        file_path=f"/static/{filename}",
        parcel_id=parcel_id
    )
    db.add(new_media)
    db.commit()
    db.refresh(new_media)
    return {
        "id": new_media.id,
        "filename": new_media.filename,
        "file_type": new_media.file_type,
        "file_path": new_media.file_path
    }

@app.delete("/media/{media_id}")
def delete_media(media_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    media = db.query(models.Media).join(models.Parcel).join(models.Tender).filter(
        models.Media.id == media_id,
        models.Tender.owner_id == current_user.id
    ).first()
    
    if not media:
        raise HTTPException(status_code=404, detail="Media not found or unauthorized")
    
    if os.path.exists(media.file_path.lstrip("/").replace("static/", "uploads/")):
        os.remove(media.file_path.lstrip("/").replace("static/", "uploads/"))
    
    db.delete(media)
    db.commit()
    return {"status": "success", "message": "Media deleted successfully"}

# --- DEBUG ENDPOINT (Remove in production!) ---
@app.get("/api/debug-db")
def debug_database(db: Session = Depends(get_db)):
    result = {"users": [], "configs": [], "parcels": []}
    
    users = db.query(models.User).all()
    for u in users:
        result["users"].append({
            "id": u.id,
            "email": u.email,
            "role": u.role
        })
    
    configs = db.query(models.MasterConfig).all()
    for cfg in configs:
        po = cfg.price_overrides
        has_price_data = False
        sample_price = None
        
        if po and isinstance(po, dict):
            shapes = list(po.keys())
            if shapes:
                first_shape = shapes[0]
                ranges = list(po[first_shape].keys()) if isinstance(po[first_shape], dict) else []
                if ranges:
                    first_range = ranges[0]
                    colors = list(po[first_shape][first_range].keys()) if isinstance(po[first_shape][first_range], dict) else []
                    if colors:
                        sample_price = po[first_shape][first_range][colors[0]].get(
                            list(po[first_shape][first_range][colors[0]].keys())[0] if po[first_shape][first_range][colors[0]] else None, 
                            None
                        ) if isinstance(po[first_shape][first_range][colors[0]], dict) else po[first_shape][first_range][colors[0]]
                        has_price_data = sample_price is not None and sample_price > 0
        
        result["configs"].append({
            "user_id": cfg.user_id,
            "default_labour_cost": cfg.default_labour_cost,
            "preferred_pricing_mode": cfg.preferred_pricing_mode,
            "price_overrides_has_data": bool(po),
            "price_overrides_shapes": list(po.keys()) if po and isinstance(po, dict) else [],
            "sample_price": sample_price
        })
    
    parcels = db.query(models.Parcel).limit(10).all()
    for p in parcels:
        calc = p.calc_state
        has_table = bool(calc and calc.get('table'))
        has_prices = bool(calc and calc.get('prices'))
        prices_has_data = False
        if has_prices and calc['prices']:
            for shape in ['Round', 'Fancy']:
                if shape in calc['prices']:
                    for rng in calc['prices'][shape]:
                        for col in calc['prices'][shape][rng]:
                            for clr in ['VVS', 'VS1', 'SI1']:
                                val = calc['prices'][shape][rng][col].get(clr, 0)
                                if val and val > 0:
                                    prices_has_data = True
                                    break
                            if prices_has_data:
                                break
                        if prices_has_data:
                            break
                    if prices_has_data:
                        break
        
        result["parcels"].append({
            "id": p.id,
            "name": p.name,
            "tender_id": p.tender_id,
            "has_calc_state_table": has_table,
            "has_calc_state_prices": has_prices,
            "prices_has_real_data": prices_has_data
        })
    
    return result

# --- SERVE FRONTEND (Single Server Mode) ---
# This assumes you have run 'npm run build' in the root directory
# and the 'dist' folder exists.

# Serve static files from the 'dist' folder
frontend_path = os.path.join(os.path.dirname(__file__), "..", "dist")

if os.path.exists(frontend_path):
    # Mount frontend FIRST
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")
    
    # Catch-all route for React client-side routing
    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        if full_path.startswith("api/") or full_path.startswith("auth/"):
            raise HTTPException(status_code=404)
        
        index_path = os.path.join(frontend_path, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        return {"error": "Frontend build not found. Run 'npm run build'"}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
