import { memo, useState } from "react";
import type {
  FunctionDefinition,
  Message as MessageType,
} from "../hooks/useChatList";
import { str } from "../utils/str";
import { cn } from "../utils/cn";
import { marked } from "marked";
import DOMPurify from "dompurify";
import {
  // ArrowUturnLeftIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  PencilSquareIcon,
  PlusCircleIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { LangSmithActions } from "./LangSmithActions";
import { DocumentList } from "./Document";
import { AutosizeTextarea } from "./AutosizeTextarea";

function tryJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch (e) {
    return {};
  }
}

function Function(props: {
  call: boolean;
  name?: string;
  onNameChange?: (newValue: string) => void;
  argsEntries?: [string, unknown][];
  onArgsEntriesChange?: (newValue: [string, unknown][]) => void;
  open?: boolean;
  editMode?: boolean;
  setOpen?: (open: boolean) => void;
}) {
  return (
    <div className="flex flex-col mt-1">
      <div className="flex flex-col">
        {props.call && (
          <span className="text-gray-900 whitespace-pre-wrap break-words mr-2 uppercase opacity-50 text-xs mb-1">
            Tool:
          </span>
        )}
        {props.name !== undefined &&
          (!props.editMode ? (
            <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-sm font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10 relative -top-[1px] mr-auto">
              {props.name}
            </span>
          ) : (
            <input
              onChange={(e) => props.onNameChange?.(e.target.value)}
              className="rounded-md bg-gray-50 px-2 py-1 text-sm font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10 -top-[1px] mr-auto focus:ring-0"
              value={props.name}
            />
          ))}
      </div>
      {!props.call && props.setOpen && (
        <span
          className={cn(
            "mr-auto inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-sm font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10 cursor-pointer relative top-1",
            props.open && "mb-2",
          )}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            props.setOpen?.(!props.open);
          }}
        >
          <ChevronDownIcon
            className={cn("h-5 w-5 transition", props.open ? "rotate-180" : "")}
          />
        </span>
      )}
      {props.argsEntries && (
        <div className="text-gray-900 whitespace-pre-wrap break-words">
          <span className="text-gray-900 whitespace-pre-wrap break-words mr-2 uppercase text-xs opacity-50">
            Arguments:
          </span>
          <div className="ring-1 ring-gray-300 rounded">
            <table className="mt-0 divide-gray-300">
              <tbody>
                {props.argsEntries.map(([key, value], i) => (
                  <tr key={i}>
                    <td
                      className={cn(
                        i === 0 ? "" : "border-t border-transparent",
                        "py-1 px-3 table-cell text-sm border-r border-r-gray-300 w-0 min-w-[128px]",
                      )}
                    >
                      {props.editMode ? (
                        <input
                          className="rounded-md font-medium text-sm text-gray-500 px-2 py-1 focus:ring-0"
                          value={key}
                          onChange={(e) => {
                            if (props.argsEntries !== undefined) {
                              props.onArgsEntriesChange?.([
                                ...props.argsEntries.slice(0, i),
                                [e.target.value, value],
                                ...props.argsEntries.slice(i + 1),
                              ]);
                            }
                          }}
                        />
                      ) : (
                        <div className="font-medium text-gray-500">{key}</div>
                      )}
                    </td>
                    <td
                      className={cn(
                        i === 0 ? "" : "border-t border-gray-200",
                        "py-1 px-3 table-cell",
                      )}
                    >
                      {props.editMode ? (
                        <div className="flex items-center">
                          <AutosizeTextarea
                            className="py-0 px-0 prose text-sm leading-normal bg-white"
                            value={str(value)?.toString()}
                            onChange={(newValue) => {
                              if (props.argsEntries !== undefined) {
                                props.onArgsEntriesChange?.([
                                  ...props.argsEntries.slice(0, i),
                                  [key, newValue],
                                  ...props.argsEntries.slice(i + 1),
                                ]);
                              }
                            }}
                          />
                          <TrashIcon
                            className="w-4 h-4 ml-2 cursor-pointer opacity-50"
                            onMouseUp={() => {
                              if (props.argsEntries !== undefined) {
                                props.onArgsEntriesChange?.([
                                  ...props.argsEntries.slice(0, i),
                                  ...props.argsEntries.slice(i + 1),
                                ]);
                              }
                            }}
                          />
                        </div>
                      ) : (
                        str(value)
                      )}
                    </td>
                  </tr>
                ))}
                {props.editMode && (
                  <tr>
                    <td></td>
                    <td className="px-3 py-2">
                      <PlusCircleIcon
                        className="ml-auto w-6 h-6 cursor-pointer opacity-50"
                        onMouseUp={() => {
                          if (props.argsEntries === undefined) {
                            return;
                          }
                          props.onArgsEntriesChange?.([
                            ...props.argsEntries,
                            ["", ""],
                          ]);
                        }}
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function initializeFunctionArgsEntries(definition: FunctionDefinition) {
  return definition.arguments !== undefined
    ? Object.entries(tryJsonParse(definition.arguments))
    : undefined;
}

function initializeToolCallFunctionArgsEntries(
  toolCalls: { function?: FunctionDefinition }[],
) {
  return toolCalls.map((toolCall) => {
    if (toolCall.function !== undefined) {
      return initializeFunctionArgsEntries(toolCall.function ?? "{}");
    } else {
      return [];
    }
  });
}

export const Message = memo(function Message(
  props: MessageType & {
    runId?: string;
    isLast?: boolean;
    editMode: boolean;
    setEditMode: (newValue: boolean) => void;
    onUpdate: (newValue: MessageType) => void;
    // onRewindPressed: () => void;
  },
) {
  const { runId, onUpdate, ...messageProps } = props;
  const [functionArgsEntries, setFunctionArgsEntries] = useState(
    messageProps.additional_kwargs?.function_call?.arguments !== undefined
      ? initializeFunctionArgsEntries(
          messageProps.additional_kwargs.function_call,
        )
      : undefined,
  );
  const [toolCallFunctionArgsEntries, setToolCallFunctionArgsEntries] =
    useState(
      messageProps.additional_kwargs?.tool_calls !== undefined
        ? initializeToolCallFunctionArgsEntries(
            messageProps.additional_kwargs.tool_calls,
          )
        : undefined,
    );
  const [messageData, setMessageData] = useState<MessageType>(() => ({
    ...messageProps,
  }));
  const [open, setOpen] = useState(false);
  const contentIsDocuments =
    ["function", "tool"].includes(messageData.type) &&
    Array.isArray(messageData.content) &&
    messageData.content.every((d) => !!d.page_content);

  const finishEditing = () => {
    props.setEditMode(false);
    const updatedMessageData = { ...messageData };
    if (
      updatedMessageData.additional_kwargs?.function_call !== undefined &&
      functionArgsEntries !== undefined
    ) {
      updatedMessageData.additional_kwargs.function_call = {
        ...updatedMessageData.additional_kwargs.function_call,
        arguments: JSON.stringify(Object.fromEntries(functionArgsEntries)),
      };
      setFunctionArgsEntries(
        initializeFunctionArgsEntries(
          updatedMessageData.additional_kwargs.function_call,
        ),
      );
    }
    if (
      updatedMessageData.additional_kwargs?.tool_calls !== undefined &&
      toolCallFunctionArgsEntries !== undefined
    ) {
      updatedMessageData.additional_kwargs.tool_calls =
        updatedMessageData.additional_kwargs.tool_calls.map((toolCall, i) => {
          if (toolCallFunctionArgsEntries[i] !== undefined) {
            return {
              ...toolCall,
              function: {
                ...toolCall.function,
                arguments: JSON.stringify(
                  Object.fromEntries(
                    toolCallFunctionArgsEntries[i]!.filter(
                      ([key]) => key?.length > 0,
                    ),
                  ),
                ),
              },
            };
          } else {
            return toolCall;
          }
        });
      setToolCallFunctionArgsEntries(
        initializeToolCallFunctionArgsEntries(
          updatedMessageData.additional_kwargs.tool_calls,
        ),
      );
    }
    onUpdate?.(updatedMessageData);
  };
  return (
    <div className="flex flex-col mb-8 group">
      <div className="leading-6 flex flex-row">
        <div
          className={cn(
            "font-medium text-sm text-gray-400 uppercase mr-2 mt-1 w-28 flex flex-col",
            messageData.type === "function" && "mt-2",
          )}
        >
          {messageData.type}
        </div>
        <div className="prose flex flex-col w-[65ch]">
          {["function", "tool"].includes(messageData.type) && (
            <Function
              call={false}
              onNameChange={(newValue) => {
                if (messageData.name !== undefined) {
                  setMessageData((prev) => ({ ...prev, name: newValue }));
                } else if (messageData.additional_kwargs !== undefined) {
                  setMessageData((prev) => {
                    const updatedMessage = { ...prev };
                    if (updatedMessage.additional_kwargs?.name !== undefined) {
                      updatedMessage.additional_kwargs.name = newValue;
                    }
                    return updatedMessage;
                  });
                }
              }}
              editMode={props.editMode}
              name={messageData.name ?? messageData.additional_kwargs?.name}
              open={open}
              setOpen={contentIsDocuments ? undefined : setOpen}
            />
          )}
          {messageData.additional_kwargs?.function_call && (
            <Function
              call={true}
              onNameChange={(newValue) => {
                setMessageData((prev) => {
                  const updatedMessage = { ...prev };
                  if (
                    updatedMessage.additional_kwargs?.function_call !==
                    undefined
                  ) {
                    updatedMessage.additional_kwargs.function_call.name =
                      newValue;
                  }
                  return updatedMessage;
                });
              }}
              argsEntries={functionArgsEntries}
              onArgsEntriesChange={setFunctionArgsEntries}
              editMode={props.editMode}
              name={messageData.additional_kwargs.function_call.name}
            />
          )}
          {messageData.additional_kwargs?.tool_calls?.map((call, i) => {
            if (call.function === undefined) {
              return <></>;
            }
            return (
              <Function
                key={i}
                call={true}
                onNameChange={(newValue) => {
                  setMessageData((prev) => {
                    const updatedMessage = { ...prev };
                    if (
                      updatedMessage.additional_kwargs?.tool_calls?.[i]
                        .function !== undefined
                    ) {
                      updatedMessage.additional_kwargs.tool_calls[
                        i
                      ].function!.name = newValue;
                    }
                    return updatedMessage;
                  });
                }}
                argsEntries={toolCallFunctionArgsEntries?.[i]}
                onArgsEntriesChange={(newValue) =>
                  setToolCallFunctionArgsEntries((prev) => {
                    if (prev !== undefined) {
                      return [
                        ...prev.slice(0, i),
                        newValue,
                        ...prev.slice(i + 1),
                      ];
                    }
                    return prev;
                  })
                }
                editMode={props.editMode}
                name={call.function?.name ?? ""}
              />
            );
          })}
          {(
            ["function", "tool"].includes(messageData.type) &&
            !contentIsDocuments
              ? open
              : true
          ) ? (
            typeof messageData.content === "string" ? (
              <>
                {props.editMode &&
                messageData.additional_kwargs?.function_call === undefined &&
                messageData.additional_kwargs?.tool_calls === undefined ? (
                  <>
                    <AutosizeTextarea
                      onChange={(newValue) =>
                        setMessageData({ ...messageProps, content: newValue })
                      }
                      onKeyDown={(e) => {
                        if (!e.metaKey && e.key === "Enter") {
                          e.preventDefault();
                          finishEditing();
                        }
                      }}
                      className="text-gray-900 text-md leading-normal prose min-w-[65ch] bg-white"
                      value={messageData.content}
                    />
                  </>
                ) : (
                  <div
                    className="text-gray-900 prose min-w-[65ch]"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(
                        marked(messageData.content),
                      ).trim(),
                    }}
                  />
                )}
              </>
            ) : contentIsDocuments ? (
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              <DocumentList documents={messageData.content as any} />
            ) : (
              <div className="text-gray-900 prose">
                {str(messageData.content)}
              </div>
            )
          ) : (
            false
          )}
        </div>
        {/* <ArrowUturnLeftIcon
          className={cn(
            "w-6 h-6 ml-2 opacity-0 group-hover:opacity-50 transition-opacity cursor-pointer",
            props.editMode ? " invisible pointer-events-none" : "",
          )}
          onMouseUp={props.onRewindPressed}
        /> */}
        {props.editMode ? (
          <CheckCircleIcon
            className="w-6 h-6 cursor-pointer ml-2 shrink-0 opacity-0 group-hover:opacity-50 transition-opacity duration-200"
            onMouseUp={finishEditing}
          />
        ) : (
          <PencilSquareIcon
            className="w-6 h-6 cursor-pointer ml-2 shrink-0 opacity-0 group-hover:opacity-50 transition-opacity duration-200"
            onMouseUp={() => props.setEditMode(true)}
          />
        )}
      </div>
      {runId && (
        <div className="mt-2 pl-6">
          <LangSmithActions runId={runId} />
        </div>
      )}
    </div>
  );
});
