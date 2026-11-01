#!/usr/bin/env python3
import os
import sys
import json
import ssl
import uuid
import urllib.request
import urllib.parse
import http.cookiejar
import subprocess

def load_env(env_path):
    env_vars = {}
    if os.path.exists(env_path):
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    env_vars[k.strip()] = v.strip().strip('"').strip("'")
    return env_vars

def main():
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    env_path = os.path.join(base_dir, '.env.cpanel')
    
    env = load_env(env_path)
    cpanel_url = os.environ.get('CPANEL_URL', env.get('CPANEL_URL', 'https://cip30.mizbanfadns.net:2083')).rstrip('/')
    cpanel_user = os.environ.get('CPANEL_USER', env.get('CPANEL_USER', ''))
    cpanel_pass = os.environ.get('CPANEL_PASS', env.get('CPANEL_PASS', ''))
    cpanel_dir = os.environ.get('CPANEL_DIR', env.get('CPANEL_DIR', 'public_html/toghrool')).strip('/')

    if not cpanel_user or not cpanel_pass:
        print("Error: CPANEL_USER or CPANEL_PASS missing.")
        print(f"Please create {env_path} with CPANEL_USER and CPANEL_PASS, or pass them as environment variables.")
        sys.exit(1)

    skip_build = '--skip-build' in sys.argv
    if not skip_build:
        print("[1/4] Building production assets (npm run build)...")
        res = subprocess.run(["npm", "run", "build"], cwd=base_dir)
        if res.returncode != 0:
            print("Build failed! Aborting deployment.")
            sys.exit(1)
    else:
        print("[1/4] Skipping build step (--skip-build flag present).")

    dist_dir = os.path.join(base_dir, 'dist')
    if not os.path.exists(dist_dir):
        print(f"Error: dist folder not found at {dist_dir}. Run npm run build first.")
        sys.exit(1)

    print(f"[2/4] Authenticating with cPanel ({cpanel_url})...")
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(
        urllib.request.HTTPCookieProcessor(cj),
        urllib.request.HTTPSHandler(context=ctx)
    )

    login_url = f'{cpanel_url}/login/?login_only=1'
    login_data = urllib.parse.urlencode({'user': cpanel_user, 'pass': cpanel_pass}).encode()
    try:
        login_res = opener.open(urllib.request.Request(login_url, data=login_data))
        login_json = json.loads(login_res.read().decode())
        sec_token = login_json.get('security_token')
        if not sec_token:
            print("Authentication failed: invalid credentials or cPanel response.")
            sys.exit(1)
        print("cPanel authenticated successfully.")
    except Exception as e:
        print(f"Failed to connect to cPanel: {e}")
        sys.exit(1)

    def upload_files(dest_dir, file_dict):
        boundary = uuid.uuid4().hex
        body = []
        def add_field(name, val):
            body.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{val}\r\n'.encode('utf-8'))
        def add_file(field_name, filename, data):
            body.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{field_name}"; filename="{filename}"\r\nContent-Type: application/octet-stream\r\n\r\n'.encode('utf-8') + data + b'\r\n')

        add_field('dir', dest_dir)
        add_field('overwrite', '1')
        
        idx = 1
        for filename, data in file_dict.items():
            add_file(f'file-{idx}', filename, data)
            idx += 1
            
        body.append(f'--{boundary}--\r\n'.encode('utf-8'))
        upload_endpoint = f'{cpanel_url}{sec_token}/execute/Fileman/upload_files'
        req = urllib.request.Request(
            upload_endpoint,
            data=b''.join(body),
            headers={'Content-Type': f'multipart/form-data; boundary={boundary}'}
        )
        res = opener.open(req)
        return json.loads(res.read().decode())

    # 3. Upload root files
    print(f"[3/4] Uploading root files to {cpanel_dir}...")
    root_files = {}
    for fname in ['index.html', 'version.json', 'server.cjs', 'server.cjs.map']:
        fpath = os.path.join(dist_dir, fname)
        if os.path.exists(fpath):
            with open(fpath, 'rb') as f:
                root_files[fname] = f.read()

    php_dir = os.path.join(base_dir, 'php-backend')
    for php_file in ['api.php', 'config.php', 'db_credentials.php', '.htaccess', 'schema.sql', 'migration_period_sharing.sql', 'migration_security.sql']:
        p_path = os.path.join(php_dir, php_file)
        if os.path.exists(p_path):
            with open(p_path, 'rb') as f:
                root_files[php_file] = f.read()

    upload_res_root = upload_files(cpanel_dir, root_files)
    print(f"Uploaded {len(root_files)} root files (status: {upload_res_root.get('status')})")

    # 4. Upload assets
    print(f"[4/4] Uploading assets to {cpanel_dir}/assets...")
    asset_files = {}
    dist_assets = os.path.join(dist_dir, 'assets')
    if os.path.exists(dist_assets):
        for fname in os.listdir(dist_assets):
            fpath = os.path.join(dist_assets, fname)
            if os.path.isfile(fpath):
                with open(fpath, 'rb') as f:
                    asset_files[fname] = f.read()

    upload_res_assets = upload_files(f'{cpanel_dir}/assets', asset_files)
    print(f"Uploaded {len(asset_files)} asset files (status: {upload_res_assets.get('status')})")

    # Ensure uploads folders
    def mkdir_safe(d):
        url = f'{cpanel_url}{sec_token}/execute/Fileman/mkdir'
        opener.open(urllib.request.Request(url, data=urllib.parse.urlencode({'dir': d}).encode()))

    for udir in ['uploads', 'uploads/avatars', 'uploads/memories']:
        try:
            mkdir_safe(f'{cpanel_dir}/{udir}')
        except Exception:
            pass

    print("\n✅ Deployment completed successfully to https://toghrool.ir !")

if __name__ == '__main__':
    main()
