# Python tools

## First-time setup (virtual environment)

The `python/.venv` folder is not in the repository (it is gitignored). After cloning or pulling, create the environment once and install dependencies.

1. **Install Python 3** (3.10+ recommended) and ensure `python` works in your terminal.

2. **From this directory** (`python/`), create the venv:

   ```bash
   python -m venv .venv
   ```

3. **Activate** the venv:

   - **PowerShell (Windows):** `.\.venv\Scripts\Activate.ps1`  
     If you see an execution policy error, run: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`
   - **Command Prompt (Windows):** `.\.venv\Scripts\activate.bat`
   - **macOS / Linux:** `source .venv/bin/activate`

4. **Install packages:**

   ```bash
   pip install -r requirements.txt
   ```

After that, run scripts (for example `python clean_data.py`) with the venv activated. To update dependencies later, run `pip install -r requirements.txt` again.
