// App-specific convenience wrappers
// This file adds aliases and helpers on top of the generated app.js

import GeneratedApp from './app.js';
import BigNumber from 'bignumber.js';

// Re-export everything from generated app, plus extras
const App = {
  ...GeneratedApp,

  // Aliases for ClientState management
  GetPresent: (client) => GeneratedApp.ClientModel(client),
  GetBaseVersion: (client) => GeneratedApp.ClientVersion(client),
  GetPendingCount: (client) => GeneratedApp.PendingCount(client),
  LocalDispatch: (client, action) => GeneratedApp.ClientLocalDispatch(client, action),
  GetPendingActions: (client) => {
    const pending = client.dtor_pending;
    const arr = [];
    for (let i = 0; i < pending.length; i++) {
      arr.push(pending[i]);
    }
    return arr;
  },

  // Convenience wrapper that takes JSON model
  InitClient: (version, modelJson) => {
    const model = GeneratedApp.modelFromJson(modelJson);
    return GeneratedApp.MakeClientState(version, model, []);
  },

  // Wrapper that takes JSON model for realtime updates
  HandleRealtimeUpdateJson: (client, serverVersion, serverModelJson) => {
    const serverModel = GeneratedApp.modelFromJson(serverModelJson);
    return GeneratedApp.HandleRealtimeUpdate(client, serverVersion, serverModel);
  },

  // Model accessors using KanbanDomain functions (accessed via the raw module)
  GetLane: (m, col) => {
    // Access the Lane function from KanbanDomain
    const lane = GeneratedApp._internal.KanbanDomain.__default.Lane(
      m,
      GeneratedApp._internal._dafny.Seq.UnicodeFromString(col)
    );
    const arr = [];
    for (let i = 0; i < lane.length; i++) {
      arr.push(lane[i].toNumber());
    }
    return arr;
  },

  GetCardTitle: (m, id) => {
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
