from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str
    full_name: str

class TokenData(BaseModel):
    user_id: Optional[str] = None
    email: Optional[str] = None

class UserRegister(BaseModel):
    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=2)
    timezone: str = "UTC"

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    timezone: str
    is_active: bool
    is_demo: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    timezone: Optional[str] = None
