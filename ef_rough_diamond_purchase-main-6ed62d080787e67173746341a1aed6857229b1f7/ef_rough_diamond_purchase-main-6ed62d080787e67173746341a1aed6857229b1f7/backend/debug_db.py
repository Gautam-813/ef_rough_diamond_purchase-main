import os
import sys
sys.path.append(os.getcwd())

from database import SessionLocal
import models
import json

def check_database():
    db = SessionLocal()
    
    print("=" * 60)
    print("DATABASE DEBUG REPORT")
    print("=" * 60)
    
    # Check users
    users = db.query(models.User).all()
    print(f"\nTotal Users: {len(users)}")
    for u in users:
        print(f"  - ID: {u.id}, Email: {u.email}, Role: {u.role}")
    
    # Check master configs
    configs = db.query(models.MasterConfig).all()
    print(f"\nTotal MasterConfigs: {len(configs)}")
    
    for cfg in configs:
        print(f"\n  Config for User ID: {cfg.user_id}")
        print(f"    - default_labour_cost: {cfg.default_labour_cost}")
        print(f"    - default_profit_margin: {cfg.default_profit_margin}")
        print(f"    - preferred_pricing_mode: {cfg.preferred_pricing_mode}")
        
        # Check price_overrides
        po = cfg.price_overrides
        if po:
            print(f"    - price_overrides: HAS DATA")
            if isinstance(po, dict):
                shapes = list(po.keys()) if isinstance(po, dict) else []
                print(f"      Shapes in price_overrides: {shapes}")
                for shape in shapes:
                    ranges = list(po[shape].keys()) if isinstance(po.get(shape), dict) else []
                    print(f"        {shape}: {len(ranges)} ranges")
                    if ranges:
                        first_range = ranges[0]
                        colors = list(po[shape][first_range].keys()) if isinstance(po[shape].get(first_range), dict) else []
                        print(f"          First range '{first_range}' has colors: {colors}")
                        if colors:
                            first_color = colors[0]
                            clarities = list(po[shape][first_range][first_color].keys()) if isinstance(po[shape][first_range].get(first_color), dict) else []
                            print(f"          First color '{first_color}' has clarities: {clarities}")
                            if clarities:
                                sample_price = po[shape][first_range][first_color].get(clarities[0], "N/A")
                                print(f"          Sample price ({shapes[0]}>{first_range}>{first_color}>{clarities[0]}): {sample_price}")
            else:
                print(f"      type: {type(po)}")
        else:
            print(f"    - price_overrides: EMPTY")
    
    # Check tenders
    tenders = db.query(models.Tender).all()
    print(f"\nTotal Tenders: {len(tenders)}")
    for t in tenders[:3]:
        print(f"  - ID: {t.id}, Name: {t.name}, Owner: {t.owner_id}")
    
    # Check parcels
    parcels = db.query(models.Parcel).all()
    print(f"\nTotal Parcels: {len(parcels)}")
    for p in parcels[:5]:
        calc = p.calc_state
        has_table = calc and isinstance(calc, dict) and bool(calc.get('table'))
        has_prices = calc and isinstance(calc, dict) and bool(calc.get('prices'))
        print(f"  - ID: {p.id}, Name: {p.name}, Tender: {p.tender_id}")
        print(f"    calc_state has table: {has_table}, has prices: {has_prices}")
    
    print("\n" + "=" * 60)
    
    db.close()

if __name__ == "__main__":
    check_database()