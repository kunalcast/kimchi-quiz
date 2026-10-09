#!/usr/bin/env python3
"""
Local mock of the Google Apps Script backend — same API shape as apps-script/Code.gs.
Run:  python3 tools/mock-server.py
Then open:  http://localhost:8766/index.html?endpoint=http://localhost:8766/exec
Plays are stored in tools/mock-db.json (gitignored).
"""
import json
import os
import re
import urllib.parse
import urllib.request
from http.server import HTTPServer, BaseHTTPRequestHandler

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mock-db.json')
GH_REPO = 'getkimchi/kimchi'
MIME = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png'}


def load_db():
    if os.path.exists(DB):
        with open(DB) as f:
            return json.load(f)
    return []


def save_db(rows):
    with open(DB, 'w') as f:
        json.dump(rows, f, indent=1)


def leaderboard(rows):
    best, entries, recent = {}, [], []
    for r in rows:
        gh = str(r.get('GitHub', '')).strip()
        if not gh:
            continue
        key = gh.lower()
        if key not in best:
            best[key] = r
            entries.append({'name': r.get('Name', ''), 'github': gh})
        elif r.get('Score', 0) > best[key].get('Score', 0):
            best[key] = r
        recent.append(r)
    top = sorted(best.values(), key=lambda x: -x.get('Score', 0))[:20]
    return {
        'result': 'success',
        'players': len(entries),
        'plays': len(rows),
        'top': [{'rank': i + 1, 'name': t.get('Name', ''), 'github': t.get('GitHub', ''),
                 'score': t.get('Score', 0), 'correct': t.get('Correct', 0)} for i, t in enumerate(top)],
        'recent': [{'name': r.get('Name', ''), 'github': r.get('GitHub', ''), 'score': r.get('Score', 0)}
                   for r in recent[-6:][::-1]],
    }


def github_stars():
    try:
        req = urllib.request.Request(
            'https://api.github.com/repos/' + GH_REPO,
            headers={'User-Agent': 'kimchi-booth-mock', 'Accept': 'application/vnd.github+json'})
        with urllib.request.urlopen(req, timeout=8) as resp:
            return {'result': 'success', 'stars': json.load(resp)['stargazers_count']}
    except Exception as e:  # offline — fall back to a placeholder
        return {'result': 'success', 'stars': 2236, 'note': 'offline fallback: ' + str(e)[:80]}


def starred(user):
    if not user or not re.fullmatch(r'[A-Za-z0-9-]{1,39}', user):
        return {'result': 'error', 'error': 'invalid username'}
    # mock rule: usernames containing "star" count as starred, anything else not
    return {'result': 'success', 'user': user, 'starred': 'star' in user.lower(), 'pages': 1}


class Handler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def _json(self, obj, code=200):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self._cors()
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/exec':
            q = urllib.parse.parse_qs(parsed.query)
            mode = (q.get('mode') or ['leaderboard'])[0]
            rows = load_db()
            if mode == 'stars':
                return self._json(github_stars())
            if mode == 'starred':
                return self._json(starred((q.get('user') or [''])[0]))
            if mode == 'raffle':
                lb = leaderboard(rows)
                return self._json({'result': 'success', 'players': lb['players'],
                                    'entries': [{'name': e['name'], 'github': e['github']}
                                                for e in lb['top']]})
            return self._json(leaderboard(rows))

        # static files
        path = parsed.path.lstrip('/') or 'index.html'
        fpath = os.path.normpath(os.path.join(ROOT, path))
        if not fpath.startswith(ROOT) or not os.path.isfile(fpath):
            return self._json({'result': 'error', 'error': 'not found: ' + path}, 404)
        with open(fpath, 'rb') as f:
            body = f.read()
        self.send_response(200)
        self.send_header('Content-Type', MIME.get(os.path.splitext(fpath)[1], 'application/octet-stream'))
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if urllib.parse.urlparse(self.path).path != '/exec':
            return self._json({'result': 'error', 'error': 'not found'}, 404)
        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length).decode()
        params = urllib.parse.parse_qs(body)
        flat = {k: v[0] for k, v in params.items()}

        def as_int(key):
            try:
                return int(str(flat.get(key, '0')))
            except ValueError:
                return 0

        name = str(flat.get('Name', ''))[:40].strip()
        github = str(flat.get('GitHub', ''))[:39].strip()
        if not name or not re.fullmatch(r'[A-Za-z0-9-]{1,39}', github):
            return self._json({'result': 'error', 'error': 'invalid name or GitHub username'})
        row = {
            'Timestamp': __import__('time').strftime('%Y-%m-%d %H:%M:%S'),
            'Name': name, 'GitHub': github,
            'Score': max(0, min(2500, as_int('Score'))),
            'Correct': max(0, min(10, as_int('Correct'))),
            'DurationSec': max(0, min(3600, as_int('DurationSec'))),
        }
        rows = load_db()
        rows.append(row)
        save_db(rows)
        return self._json({'result': 'success', 'row': len(rows) + 1})

    def log_message(self, fmt, *args):
        print('  ', self.command, self.path, '→', fmt % args if args else '')


if __name__ == '__main__':
    print('Mock backend + static server → http://localhost:8766')
    print('  TV:      http://localhost:8766/index.html?endpoint=http://localhost:8766/exec')
    print('  Quiz:    http://localhost:8766/play.html?endpoint=http://localhost:8766/exec')
    print('  Admin:   http://localhost:8766/admin.html?endpoint=http://localhost:8766/exec')
    HTTPServer(('localhost', 8766), Handler).serve_forever()
