#!/usr/bin/env python3
"""
Generate a cryptographically secure JWT secret for LearnLoop AI.

Usage:
    python -m backend.generate_jwt_secret
    # or
    python backend/generate_jwt_secret.py

Copy the output value into your .env file as JWT_SECRET=<value>.

WARNING: Changing JWT_SECRET invalidates ALL existing user sessions immediately.
         Every logged-in user will be signed out and must re-authenticate.
         Schedule rotation during a maintenance window and notify users in advance.
"""
import secrets


def main() -> None:
    secret = secrets.token_hex(32)  # 256 bits of entropy
    print(f"JWT_SECRET={secret}")
    print()
    print("WARNING: Changing JWT_SECRET invalidates ALL existing user sessions.")
    print("         Users will need to log in again on every device.")


if __name__ == "__main__":
    main()

