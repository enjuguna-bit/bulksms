import "./src/polyfills";
/**
 * Entry point — React Native CLI version
 */
import { AppRegistry } from "react-native";
import App from "./App";

// MUST match MainActivity.getMainComponentName()
AppRegistry.registerComponent("bulksms", () => App);
