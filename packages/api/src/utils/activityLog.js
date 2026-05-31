"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logActivity = logActivity;
const client_1 = __importDefault(require("../prisma/client"));
async function logActivity(userId, action, details, ipAddress) {
    try {
        await client_1.default.activityLog.create({
            data: { userId, action, details, ipAddress },
        });
    }
    catch {
        // Silent fail — logging should never break the main flow
    }
}
//# sourceMappingURL=activityLog.js.map