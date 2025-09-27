import { z } from 'zod';
import zodToJsonSchemaOriginal from 'zod-to-json-schema';

// src/zod-to-json.ts
function zodToJsonSchema(zodSchema, target = "jsonSchema7", strategy = "relative") {
  const fn = "toJSONSchema";
  if (fn in z) {
    return z[fn](zodSchema, {
      unrepresentable: "any",
      override: (ctx) => {
        const def = ctx.zodSchema?._zod?.def;
        if (def && def.type === "date") {
          ctx.jsonSchema.type = "string";
          ctx.jsonSchema.format = "date-time";
        }
      }
    });
  } else {
    return zodToJsonSchemaOriginal(zodSchema, {
      $refStrategy: strategy,
      target
    });
  }
}

export { zodToJsonSchema };
//# sourceMappingURL=chunk-GWTUXMDD.js.map
//# sourceMappingURL=chunk-GWTUXMDD.js.map