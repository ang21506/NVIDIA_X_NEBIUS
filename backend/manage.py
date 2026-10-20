"""Explicit maintenance commands. Run from the repository root."""
import argparse
from backend.app.config import settings
from backend.app.database import SessionLocal
from backend.app.models.resource import Resource
from backend.app.services.document_service import DocumentService
from backend.app.services.seed_service import SeedService


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('command', choices=['seed-demo', 'reindex'])
    parser.add_argument('--user-id', help='Required for reindex; only this user is processed')
    args = parser.parse_args()
    with SessionLocal() as db:
        if args.command == 'seed-demo':
            if settings.APP_ENV == 'production':
                parser.error('Demo seeding is disabled in production')
            SeedService.seed_demo_data(db)
            print('Development demo data seeded.')
        else:
            if not args.user_id:
                parser.error('reindex requires --user-id')
            ids = [r.id for r in db.query(Resource).filter(Resource.user_id == args.user_id).all()]
            failed = 0
            for resource_id in ids:
                if not DocumentService.process_and_index_file(db, resource_id):
                    failed += 1
            print(f'Indexed {len(ids) - failed} documents; {failed} failed.')
            if failed:
                raise SystemExit(1)


if __name__ == '__main__':
    main()
