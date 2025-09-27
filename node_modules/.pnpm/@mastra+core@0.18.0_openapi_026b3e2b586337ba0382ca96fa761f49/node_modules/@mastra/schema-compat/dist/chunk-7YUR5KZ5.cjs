'use strict';

var zod = require('zod');
var zodToJsonSchemaOriginal = require('zod-to-json-schema');

function _interopDefault (e) { return e && e.__esModule ? e : { default: e }; }

var zodToJsonSchemaOriginal__default = /*#__PURE__*/_interopDefault(zodToJsonSchemaOriginal);

// src/zod-to-json.ts
function zodToJsonSchema(zodSchema, target = "jsonSchema7", strategy = "relative") {
  const fn = "toJSONSchema";
  if (fn in zod.z) {
    return zod.z[fn](zodSchema, {
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
    return zodToJsonSchemaOriginal__default.default(zodSchema, {
      $refStrategy: strategy,
      target
    });
  }
}

exports.zodToJsonSchema = zodToJsonSchema;
//# sourceMappingURL=chunk-7YUR5KZ5.cjs.map
//# sourceMappingURL=chunk-7YUR5KZ5.cjs.map