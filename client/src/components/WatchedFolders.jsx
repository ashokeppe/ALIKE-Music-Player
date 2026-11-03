import { useEffect, useState } from "react";
import { useAuth } from "../AuthContext.jsx";
import { listFolders, removeFolder, requestAccess, subscribe, syncAll, watchSupported } from "../folderWatch.js";
import "./folders.css";

function useWatched(userId) {
  const [folders, setFolders] = useState([]);
  const [status, setStatus] = useState({});
  useEffect(() => {
    let alive = true;
    let last = -1;
    const off = subscribe((s, version) => {
      setStatus(s);
      if (version !== last) {
        last = version;
        listFolders(userId).then((f) => alive && setFolders(f)).catch(() => {});
      }
    });
    return () => { alive = false; off(); };
  }, [userId]);
  return { folders, status };
}

const ago = (t) => {
  const m = Math.round((Date.now() - t) / 60000);
  return m < 1 ? "just now" : m === 1 ? "1 minute ago" : `${m} minutes ago`;
};

const describe = (st) => {
  if (!st) return "Checking…";
  switch (st.state) {
    case "scanning": return "Checking for new songs…";
    case "importing": return `Importing new songs: ${st.done} of ${st.total}…`;
    case "permission": return "Needs your permission to look inside this folder.";
    case "missing": return "Folder not found. It may have been moved, renamed or deleted.";
    case "offline": return "Waiting for the server. Will try again soon.";
    case "error": return `Problem: ${st.message}`;
    default: return st.checkedAt ? `Up to date · checked ${ago(st.checkedAt)}` : "Up to date";
  }
};

// Shown on every page when the browser needs a click to look in a watched folder again (e.g. after a restart)
export function FolderAccessBanner() {
  const { user } = useAuth();
  const { folders, status } = useWatched(user.id);
  const needs = folders.filter((f) => status[f.id]?.state === "permission");
  if (!watchSupported || !needs.length) return null;
  return (
    <div className="fbanner">
      <span>Allow access to “{needs[0].name}” so new songs added to it can be imported automatically.</span>
      <button onClick={() => requestAccess(needs[0], user.id)}>Allow access</button>
    </div>
  );
}

// The list of watched folders (on the Import page)
export default function WatchedFolders() {
  const { user } = useAuth();
  const { folders, status } = useWatched(user.id);

  return (
    <section className="wf">
      <h2>Auto-import folders</h2>
      {!watchSupported ? (
        <p className="hint">
          Your browser can't keep an eye on folders. Use Chrome or Edge on a computer for automatic imports. You can
          still choose the folder again whenever you add songs: songs that are already in your library are skipped.
        </p>
      ) : (
        <p className="hint">
          Choose a folder above and keep “watching” it: new songs you add to that folder are imported automatically.
          The app checks every minute while it is open in your browser. Songs you delete from the library are not
          imported again.
        </p>
      )}

      {watchSupported && !folders.length && <p className="dim">No watched folders yet.</p>}

      {folders.map((f) => {
        const st = status[f.id];
        const busy = st?.state === "importing" || st?.state === "scanning";
        return (
          <div className="wfrow" key={f.id}>
            <div className="info">
              <b title={f.name}>{f.name}</b>
              <span className={st?.state === "missing" || st?.state === "error" ? "bad" : ""}>{describe(st)}</span>
              {st?.failed?.length > 0 && (
                <span className="bad">
                  {st.failed.length} song{st.failed.length === 1 ? "" : "s"} could not be imported: {st.failed[0].name} ({st.failed[0].message})
                </span>
              )}
            </div>
            {st?.state === "permission" && <button onClick={() => requestAccess(f, user.id)}>Allow access</button>}
            <button onClick={() => syncAll(user.id)} disabled={busy}>Check now</button>
            <button onClick={() => removeFolder(f.id)}>Stop watching</button>
          </div>
        );
      })}
    </section>
  );
}
