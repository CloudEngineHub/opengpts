import { useEffect, useState } from "react";
import { PaperAirplaneIcon, XCircleIcon } from "@heroicons/react/20/solid";
import CodeMirror from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { EditorView, keymap } from "@codemirror/view";
import { defaultKeymap } from "@codemirror/commands";
import { useSchemas } from "../hooks/useSchemas";
import { cn } from "../utils/cn";

function generateSimplest(schema: any): any {
  if (schema.type === "object") {
    const obj: any = {};
    const requiredKeys = schema.required || [];
    for (const key in schema.properties) {
      if (requiredKeys.includes(key)) {
        obj[key] = generateSimplest(schema.properties[key]);
      }
    }
    return obj;
  } else if (schema.type === "array") {
    return schema.items ? [generateSimplest(schema.items)] : [];
  } else if (schema.type === "string") {
    return "";
  } else if (schema.type === "number" || schema.type === "integer") {
    return 0;
  } else if (schema.type === "boolean") {
    return false;
  } else if (schema.type === "null") {
    return null;
  } else if (Array.isArray(schema.anyOf)) {
    const schemaChoice = schema.anyOf.find((choice: { type: string }) =>
      ["number", "string", "boolean"].includes(choice.type),
    );
    if (schemaChoice) {
      return generateSimplest(schemaChoice);
    }
  }
}

export function JsonEditor(props: {
  onSubmit?: (data: string) => void;
  onInterrupt?: () => void;
  height?: string;
  inflight?: boolean;
  disabled?: boolean;
  isDocumentRetrievalActive?: boolean;
  hideSubmitButton?: boolean;
  value?: string;
  setValue?: React.Dispatch<React.SetStateAction<string>>;
}) {
  const [inflight, setInflight] = useState(false);
  const isInflight = props.inflight || inflight;
  const { inputSchema } = useSchemas();
  const [defaultValue, setDefaultValue] = useState("{}");
  useEffect(() => {
    setDefaultValue(
      JSON.stringify(generateSimplest(inputSchema ?? {}), null, 2),
    );
  }, [inputSchema]);
  return (
    <div className="flex flex-col">
      <form
        className="mt-2 flex rounded-md shadow-sm"
        onSubmit={async (e) => {
          e.preventDefault();
          if (isInflight) return;
          const input = props?.value ?? defaultValue;
          if (!input) return;
          setInflight(true);
          await props.onSubmit?.(input);
          setInflight(false);
          (props.setValue ?? setDefaultValue)(
            JSON.stringify(generateSimplest(inputSchema ?? {}), null, 2),
          );
        }}
      >
        {" "}
        <div
          className={cn(
            "relative flex flex-grow items-stretch focus-within:z-10",
            isInflight && "opacity-50 cursor-not-allowed",
          )}
        >
          <CodeMirror
            value={props.value ?? defaultValue}
            onChange={props.setValue ?? setDefaultValue}
            height={props.height ?? "20vh"}
            className={cn(
              "max-w-full w-full overflow-auto min-w-0",
              (isInflight || props.disabled) && "opacity-50",
            )}
            readOnly={isInflight || props.disabled}
            extensions={[
              keymap.of([
                { key: "Mod-Enter", run: () => true },
                ...defaultKeymap,
              ]),
              json(),
              EditorView.lineWrapping,
              EditorView.theme({
                "&.cm-editor": {
                  backgroundColor: "transparent",
                  transform: "translateX(-1px)",
                },
                "&.cm-focused": {
                  outline: "none",
                },
                green: {
                  background: "green",
                },
                "& .cm-content": {
                  padding: "12px",
                },
                "& .cm-line": {
                  fontFamily: "'Fira Code', monospace",
                  padding: 0,
                  overflowAnchor: "none",
                  fontVariantLigatures: "none",
                },
                "& .cm-gutters.cm-gutters": {
                  backgroundColor: "transparent",
                },
                "& .cm-lineNumbers .cm-gutterElement.cm-activeLineGutter": {
                  marginLeft: "1px",
                },
                "& .cm-lineNumbers": {
                  minWidth: "42px",
                },
                "& .cm-foldPlaceholder": {
                  padding: "0px 4px",
                  color: "hsl(var(--ls-gray-100))",
                  backgroundColor: "hsl(var(--divider-500))",
                  borderColor: "hsl(var(--divider-700))",
                },
                '& .cm-gutterElement span[title="Fold line"]': {
                  transform: "translateY(-4px)",
                  display: "inline-block",
                },
              }),
            ]}
          />
        </div>
        {!props.hideSubmitButton && (
          <button
            type="submit"
            disabled={props.disabled || (isInflight && !props.onInterrupt)}
            onClick={
              props.onInterrupt
                ? (e) => {
                    e.preventDefault();
                    props.onInterrupt?.();
                  }
                : undefined
            }
            className={cn(
              "relative -ml-px inline-flex items-center gap-x-1.5 rounded-r-md px-3 " +
                "py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 bg-white",
              (props.disabled || (isInflight && !props.onInterrupt)) &&
                "opacity-50 cursor-not-allowed",
            )}
          >
            {props.onInterrupt ? (
              <XCircleIcon
                className="-ml-0.5 h-5 w-5 text-gray-400"
                aria-hidden="true"
              />
            ) : (
              <PaperAirplaneIcon
                className="-ml-0.5 h-5 w-5 text-gray-400"
                aria-hidden="true"
              />
            )}
            {isInflight
              ? props.onInterrupt
                ? "Cancel"
                : "Sending..."
              : "Send"}
          </button>
        )}
      </form>
    </div>
  );
}
