import { useCallback, useEffect, useMemo, useState } from "react";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { v4 as uuidv4 } from "uuid";
import { Chat } from "./components/Chat";
import { ChatList } from "./components/ChatList";
import { Layout } from "./components/Layout";
import { NewChat } from "./components/NewChat";
import {
  Chat as ChatType,
  Message as MessageType,
  useChatList,
} from "./hooks/useChatList";
import { useSchemas } from "./hooks/useSchemas";
import { useStreamState } from "./hooks/useStreamState";
import { useConfigList } from "./hooks/useConfigList";
import { Config } from "./components/Config";
import { MessageWithFiles } from "./utils/formTypes.ts";
import { TYPE_NAME } from "./constants.ts";
import { StateGraphDebugger } from "./components/StateGraphDebugger.tsx";

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { configSchema, configDefaults, outputSchema } = useSchemas();
  const { chats, currentChat, createChat, enterChat } = useChatList();
  const { configs, currentConfig, saveConfig, enterConfig } = useConfigList();
  const {
    startStream,
    stopStream,
    stream,
    setStreamStateStatus,
    streamErrorMessage,
    setStreamErrorMessage,
  } = useStreamState();
  const [isDocumentRetrievalActive, setIsDocumentRetrievalActive] =
    useState(false);

  useEffect(() => {
    let configurable = null;
    if (currentConfig) {
      configurable = currentConfig?.config?.configurable;
    }
    if (currentChat && configs) {
      const conf = configs.find(
        (c) => c.assistant_id === currentChat.assistant_id,
      );
      configurable = conf?.config?.configurable;
    }
    const agent_type = configurable?.["type"] as TYPE_NAME | null;
    if (agent_type === null || agent_type === "chatbot") {
      setIsDocumentRetrievalActive(false);
      return;
    }
    if (agent_type === "chat_retrieval") {
      setIsDocumentRetrievalActive(true);
      return;
    }
    const tools =
      (configurable?.["type==agent/tools"] as { name: string }[]) ?? [];
    setIsDocumentRetrievalActive(tools.some((t) => t.name === "Retrieval"));
  }, [currentConfig, currentChat, configs]);

  const startTurn = useCallback(
    async (props: {
      message?: MessageWithFiles;
      previousMessages?: MessageType[];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      config?: Record<string, any>;
      chat?: ChatType | null;
    }) => {
      const {
        message,
        previousMessages = [],
        chat = currentChat,
        config,
      } = props;
      if (!chat) return;
      const defaultConfig = configs?.find(
        (c) => c.assistant_id === chat.assistant_id,
      )?.config;
      if (!defaultConfig) return;
      const files = message?.files || [];
      if (files.length > 0) {
        const formData = files.reduce((formData, file) => {
          formData.append("files", file);
          return formData;
        }, new FormData());
        formData.append(
          "config",
          JSON.stringify({ configurable: { thread_id: chat.thread_id } }),
        );
        await fetch(`/ingest`, {
          method: "POST",
          body: formData,
        });
      }
      await startStream({
        input: message
          ? [
              ...previousMessages,
              {
                content: message.message,
                additional_kwargs: {},
                type: "human",
                example: false,
              },
            ]
          : previousMessages.length
            ? [...previousMessages]
            : null,
        assistant_id: chat.assistant_id,
        thread_id: chat.thread_id,
        config,
      });
    },
    [currentChat, startStream, configs],
  );

  const startChat = useCallback(
    async (message: MessageWithFiles) => {
      if (!currentConfig) return;
      const chat = await createChat(
        message.message,
        currentConfig.assistant_id,
      );
      return startTurn({ message, chat });
    },
    [createChat, startTurn, currentConfig],
  );

  const startStateGraph = useCallback(
    async (state: string) => {
      if (!currentConfig) return;
      const chat = await createChat(uuidv4(), currentConfig.assistant_id);
      startStateGraphTurn({
        state,
        assistant_id: chat.assistant_id,
        thread_id: chat.thread_id,
      });
    },
    [currentConfig],
  );

  const startStateGraphTurn = useCallback(
    async (props: {
      state: string | null;
      assistant_id: string;
      thread_id: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      config?: Record<string, any>;
    }) => {
      const { state, assistant_id, thread_id, config } = props;
      setStreamStateStatus("inflight");
      try {
        const res = await fetch("/runs/eager", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            input: state ? JSON.parse(state) : null,
            assistant_id,
            thread_id,
            config,
          }),
        });
        const text = await res.text();
        console.log(text, res.ok);
        if (!res.ok) {
          throw new Error(text ?? "Unspecified error running state graph.");
        } else {
          setStreamStateStatus("done");
        }
      } catch (e: any) {
        setStreamStateStatus("error");
        setStreamErrorMessage(e.message);
      }
    },
    [currentConfig],
  );

  const selectChat = useCallback(
    async (id: string | null) => {
      if (currentChat) {
        stopStream?.(true);
      }
      enterChat(id);
      if (!id) {
        enterConfig(configs?.[0]?.assistant_id ?? null);
        window.scrollTo({ top: 0 });
      }
      if (sidebarOpen) {
        setSidebarOpen(false);
      }
    },
    [enterChat, stopStream, sidebarOpen, currentChat, enterConfig, configs],
  );

  const selectConfig = useCallback(
    (id: string | null) => {
      enterConfig(id);
      enterChat(null);
    },
    [enterConfig, enterChat],
  );

  const isMessageGraph = outputSchema?.type === "array";

  const content = currentChat ? (
    isMessageGraph ? (
      <Chat
        chat={currentChat}
        startStream={startTurn}
        stopStream={stopStream}
        stream={stream}
        isDocumentRetrievalActive={isDocumentRetrievalActive}
        streamErrorMessage={streamErrorMessage}
        setStreamErrorMessage={setStreamErrorMessage}
      />
    ) : (
      <StateGraphDebugger
        chat={currentChat}
        startStateGraph={startStateGraphTurn}
        stopStream={stopStream}
        stream={stream}
        streamErrorMessage={streamErrorMessage}
        setStreamErrorMessage={setStreamErrorMessage}
      ></StateGraphDebugger>
    )
  ) : currentConfig ? (
    <NewChat
      startChat={startChat}
      startStateGraph={startStateGraph}
      configSchema={configSchema}
      configDefaults={configDefaults}
      configs={configs}
      currentConfig={currentConfig}
      saveConfig={saveConfig}
      enterConfig={selectConfig}
      isMessageGraph={isMessageGraph}
      isDocumentRetrievalActive={isDocumentRetrievalActive}
    />
  ) : (
    <Config
      className="mb-6"
      config={currentConfig}
      configSchema={configSchema}
      configDefaults={configDefaults}
      saveConfig={saveConfig}
    />
  );

  const currentChatConfig = configs?.find(
    (c) => c.assistant_id === currentChat?.assistant_id,
  );

  return (
    <Layout
      subtitle={
        currentChatConfig ? (
          <span className="inline-flex gap-1 items-center">
            {currentChatConfig.name}
            <InformationCircleIcon
              className="h-5 w-5 cursor-pointer text-indigo-600"
              onClick={() => {
                selectConfig(currentChatConfig.assistant_id);
              }}
            />
          </span>
        ) : null
      }
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      sidebar={
        <ChatList
          chats={useMemo(() => {
            if (configs === null || chats === null) return null;
            return chats.filter((c) =>
              configs.some((config) => config.assistant_id === c.assistant_id),
            );
          }, [chats, configs])}
          currentChat={currentChat}
          enterChat={selectChat}
          currentConfig={currentConfig}
          enterConfig={selectConfig}
        />
      }
    >
      {configSchema ? content : null}
    </Layout>
  );
}

export default App;
