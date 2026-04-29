import asyncio
from logging.config import fileConfig
from sqlalchemy.ext.asyncio import create_async_engine
from alembic import context
from app.config import settings
from app.database import Base
import app.models

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

# Схемы которые Alembic должен игнорировать (встроенные таблицы PostGIS/Tiger)
IGNORE_SCHEMAS = {"tiger", "tiger_data", "topology"}

def include_object(object, name, type_, reflected, compare_to):
    if type_ == "table" and object.schema in IGNORE_SCHEMAS:
        return False
    # Игнорируем таблицы которые не наши
    OUR_TABLES = {
        "users", "cars", "carwashes", "services",
        "slots", "bookings", "reviews", "favorites"
    }
    if type_ == "table" and reflected and name not in OUR_TABLES:
        return False
    return True


def run_migrations_offline():
    context.configure(
        url=settings.DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        include_object=include_object,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online():
    connectable = create_async_engine(settings.DATABASE_URL)
    async with connectable.connect() as connection:
        await connection.run_sync(
            lambda conn: context.configure(
                connection=conn,
                target_metadata=target_metadata,
                include_object=include_object,
            )
        )
        async with connection.begin():
            await connection.run_sync(lambda _: context.run_migrations())
    await connectable.dispose()


def run():
    if context.is_offline_mode():
        run_migrations_offline()
    else:
        asyncio.run(run_migrations_online())


run()