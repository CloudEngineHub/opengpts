from typing import Any, Mapping, Optional, Sequence

from langchain_core.messages import AnyMessage
from langchain_core.runnables import (
    RunnableBinding,
)

from app.chain import get_chain


class ConfigurableAgent(RunnableBinding):
    interrupt_before_action: bool = True

    def __init__(
        self,
        *,
        interrupt_before_action: bool = False,
        kwargs: Optional[Mapping[str, Any]] = None,
        config: Optional[Mapping[str, Any]] = None,
        **others: Any,
    ) -> None:
        others.pop("bound", None)
        _agent = get_chain(
            interrupt_before_action,
        )
        agent_executor = _agent.with_config({"recursion_limit": 50})
        super().__init__(
            bound=agent_executor,
            kwargs=kwargs or {},
            config=config or {},
        )


agent = (
    ConfigurableAgent(
        assistant_id=None,
        thread_id=None,
    )
    .configurable_fields(
        # thread_id=ConfigurableField(id="thread_id", name="Thread ID", is_shared=True),
    )
    .with_types(input_type=Sequence[AnyMessage], output_type=Sequence[AnyMessage])
)

if __name__ == "__main__":
    import asyncio

    from langchain.schema.messages import HumanMessage

    async def run():
        async for m in agent.astream_events(
            HumanMessage(content="whats your name"),
            config={"configurable": {"user_id": "2", "thread_id": "test1"}},
            version="v1",
        ):
            print(m)

    asyncio.run(run())
