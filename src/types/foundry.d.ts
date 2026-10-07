// Foundry VTT ne publie pas de types officiels pour la v14 : on déclare les
// globaux utilisés de manière permissive et on type nos propres structures.
declare global {
  const foundry: any;
  const game: any;
  const ui: any;
  const Hooks: any;
  const CONFIG: any;
  const CONST: any;
  function fromUuid(uuid: string): Promise<any>;
}

export {};
