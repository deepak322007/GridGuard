# GridGuard

A responsive, client-side prototype of the GridGuard distribution-loss dashboard, based on the supplied Sankalp Climate Edition brief.

## Run locally

From this folder, start a static server:

```powershell
python -m http.server 4173
```

Then open [http://localhost:4173](http://localhost:4173).

There are no package installs or external services. All readings, transformer records, and network topology are synthetic. The demo controls toggle the DT-03 loss scenario locally; they do not connect to meters or dispatch field teams.
