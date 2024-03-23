import asyncio
import importlib
import os
import pathlib
from typing import Optional

import asyncpg
import click
import uvicorn
from langgraph.pregel import Pregel
from langgraph.checkpoint import CheckpointAt

from app.hack import USER_SPECIFIED_CHAIN
from app.lib.checkpoint import PostgresCheckpoint
from app.lib.lifespan import connect


@click.command()
@click.argument(
    "path",
    required=False,
    type=str,
)
def start(path: Optional[str]):
    """Simple program that greets NAME for a total of COUNT times."""

    os.environ.update(
        {
            "POSTGRES_PORT": "5433",
            "POSTGRES_DB": "postgres",
            "POSTGRES_USER": "postgres",
            "POSTGRES_PASSWORD": "postgres",
            "POSTGRES_HOST": "localhost",
        }
    )

    if path is None:
        print("Starting LangGraph Studio with demo graph")
    else:
        print(f"Starting LangGraph Studio with graph at path: {path}")

        try:
            module = importlib.import_module(path)
        except ImportError as e:
            print(f"Could not import python module at path: {path} {e}")
            return
        try:
            graph = module.graph
        except AttributeError:
            print(f"Could not find `graph` in module at path: {path}")
            return
        if isinstance(graph, Pregel):
            pass
        else:
            print(f"Graph is not a compiled LangGraph graph: {graph}")
            return

        graph.checkpointer = PostgresCheckpoint(at=CheckpointAt.END_OF_STEP)

        USER_SPECIFIED_CHAIN.chain = graph

    # uvicorn.run(app, host="0.0.0.0", port=8100)
    server = uvicorn.Server(uvicorn.Config("app.server:app", host="0.0.0.0", port=8100))
    compose_spec = pathlib.Path(__file__).parent / "../../docker-compose-cli.yml"

    async def serve_once_ready():
        while True:
            conn: Optional[asyncpg.Connection] = None
            try:
                print("Waiting for database to be ready...")
                conn = await connect()
                await conn.execute("select * from assistant limit 1")
                break
            except Exception as exc:
                print(f"Database not ready, retrying... {exc}")
                if conn:
                    await conn.close()
                await asyncio.sleep(0.5)

        await server.serve()

    async def run_both():
        await asyncio.gather(
            exec_cmd("docker", "compose", "-f", str(compose_spec.resolve()), "up"),
            serve_once_ready(),
        )

    server.config.setup_event_loop()
    asyncio.run(run_both())


async def exec_cmd(cmd: str, *args: str):
    proc = await asyncio.create_subprocess_exec(cmd, *args)
    await proc.communicate()

    if proc.returncode != 0 and proc.returncode != 130:
        print(proc.returncode)
        raise Exception(f"Command failed: {cmd} {' '.join(args)}")


if __name__ == "__main__":
    start()
