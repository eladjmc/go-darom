declare module "goban-engine" {
  export class GobanEngine {
    constructor(config: Record<string, unknown>);
  }

  const gobanEngine: {
    GobanEngine: typeof GobanEngine;
  };

  export default gobanEngine;
}
