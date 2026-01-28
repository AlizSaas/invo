import { createStart } from "@tanstack/react-start";


declare module "@tanstack/react-start" {
  interface Register {
    server: {
      requestContext: {
       env: Env;
        waitUntil: (p: Promise<any>) => void;
        fromFetch: boolean;
         
        
        
        
      };
    };
  }
} // this code block is necessary to augment the module types

export const startInstance = createStart(() => {
  return {
    defaultSsr: true,

  };
}); // this code block initializes the start instance