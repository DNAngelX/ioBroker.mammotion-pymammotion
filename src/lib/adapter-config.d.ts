declare global {
    namespace ioBroker {
        interface AdapterConfig {
            email: string;
            password: string;
            pythonExecutable?: string;
            sidecarLogLevel: "debug" | "info" | "warning" | "error";
            bootstrapOnStart: boolean;
        }
    }
}

export {};
