"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AuthLayout;
const expo_router_1 = require("expo-router");
function AuthLayout() {
    return (<expo_router_1.Stack screenOptions={{ headerShown: false }}>
      <expo_router_1.Stack.Screen name="login"/>
    </expo_router_1.Stack>);
}
//# sourceMappingURL=_layout.js.map