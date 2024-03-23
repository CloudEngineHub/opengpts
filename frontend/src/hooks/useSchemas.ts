import { useEffect, useState } from "react";
import { simplifySchema } from "../utils/simplifySchema";
import { JsonRefs } from "../utils/json-refs";
import { getDefaults } from "../utils/defaults";

export interface SchemaField {
  type: string;
  title: string;
  description: string;
  enum?: string[];
  items?: SchemaField;
  allOf?: SchemaField[];
}

export interface Schemas {
  configSchema: null | {
    properties: {
      configurable: {
        properties: {
          [key: string]: SchemaField;
        };
      };
    };
  };
  configDefaults: null | {
    configurable?: {
      [key: string]: unknown;
    };
  };
  inputSchema: null | {
    [key: string]: unknown;
  };
  outputSchema: null | {
    [key: string]: unknown;
  };
}

export function useSchemas() {
  const [schemas, setSchemas] = useState<Schemas>({
    configSchema: null,
    configDefaults: null,
    inputSchema: null,
    outputSchema: null,
  });

  useEffect(() => {
    async function save() {
      const [configSchema, inputSchema, outputSchema] = await Promise.all([
        fetch("/runs/config_schema")
          .then((r) => r.json())
          .then(simplifySchema),
        fetch("/runs/input_schema")
          .then((r) => r.json())
          .then((r) => JsonRefs.resolveRefs(r))
          .then((r) => r.resolved),
        fetch("/runs/output_schema")
          .then((r) => r.json())
          .then((r) => JsonRefs.resolveRefs(r))
          .then((r) => r.resolved),
      ]);
      setSchemas({
        configSchema,
        configDefaults: getDefaults(configSchema) as Record<string, unknown>,
        inputSchema,
        outputSchema,
      });
    }

    save();
  }, []);

  return schemas;
}
