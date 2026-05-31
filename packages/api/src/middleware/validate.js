"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
const zod_1 = require("zod");
const response_1 = require("../utils/response");
function validate(schema, target = 'body') {
    return (req, _res, next) => {
        try {
            const data = schema.parse(req[target]);
            req[target] = data;
            next();
        }
        catch (err) {
            if (err instanceof zod_1.z.ZodError) {
                const message = err.errors
                    .map((e) => `${e.path.join('.')}: ${e.message}`)
                    .join('; ');
                throw new response_1.ValidationError(message);
            }
            throw err;
        }
    };
}
//# sourceMappingURL=validate.js.map