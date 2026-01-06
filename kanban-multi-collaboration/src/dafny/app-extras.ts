// App-specific convenience wrappers
// This file adds aliases and helpers on top of the generated app.ts

import GeneratedApp from './app.ts';
import BigNumber from 'bignumber.js';

// Cast _internal for access to Dafny runtime modules
const { _dafny, KanbanDomain } = GeneratedApp._internal as any;

// Re-export everything from generated app, plus extras
const App = {
  ...GeneratedApp,

  // Aliases for ClientState management
  GetPresent: (client: any) => GeneratedApp.ClientModel(client),
  GetBaseVersion: (client: any) => GeneratedApp.ClientVersion(client),
  GetPendingCount: (client: any) => GeneratedApp.PendingCount(client),
  LocalDispatch: (client: any, action: any) => GeneratedApp.ClientLocalDispatch(client, action),
  GetPendingActions: (client: any) => {
    const pending = client.dtor_pending;
    const arr: any[] = [];
    for (let i = 0; i < pending.length; i++) {
      arr.push(pending[i]);
    }
    return arr;
  },

  // Convenience wrapper that takes JSON model
  InitClient: (version: number, modelJson: any) => {
    const model = GeneratedApp.modelFromJson(modelJson);
    return GeneratedApp.MakeClientState(version, model, []);
  },

  // Wrapper that takes JSON model for realtime updates
  HandleRealtimeUpdateJson: (client: any, serverVersion: number, serverModelJson: any) => {
    const serverModel = GeneratedApp.modelFromJson(serverModelJson);
    return GeneratedApp.HandleRealtimeUpdate(client, serverVersion, serverModel);
  },

  // Model accessors using KanbanDomain functions (accessed via the raw module)
  GetLane: (m: any, col: string) => {
    // Access the Lane function from KanbanDomain
    const lane = KanbanDomain.__default.Lane(
      m,
      _dafny.Seq.UnicodeFromString(col)
    );
    const arr: number[] = [];
    for (let i = 0; i < lane.length; i++) {
      arr.push(lane[i].toNumber());
    }
    return arr;
  },

  GetCardTitle: (m: any, id: number) => {
    const cardsMap = m.dtor_cards;
    const key = new BigNumber(id);
    if (cardsMap.contains(key)) {
      const card = cardsMap.get(key);
      if (card && card.dtor_title !== undefined) {
        const title = card.dtor_title;
        if (title.toVerbatimString) return title.toVerbatimString(false);
        return Array.from(title).join('');
      }
    }
    return '';
  },
};

export default App;
