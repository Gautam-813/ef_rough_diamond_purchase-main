import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv


load_dotenv()

# Hardcoded PostgreSQL connection to Neon - ensures data persistence
# Using Neon PostgreSQL for production reliability
SQLALCHEMY_DATABASE_URL = "postgresql://neondb_owner:npg_cCV10ZjmWYBL@ep-silent-feather-ancnww5y.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require"

# Use NullPool for PostgreSQL (Neon) to handle unstable connections properly
from sqlalchemy.pool import NullPool
engine_args = {"poolclass": NullPool}

engine = create_engine(SQLALCHEMY_DATABASE_URL, **engine_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency to get the DB session for our API endpoints
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
