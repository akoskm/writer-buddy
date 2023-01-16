const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('API', {
    setGoal: (args) => {
        ipcRenderer.invoke('set-goal', args)
    }
})