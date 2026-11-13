import os

ROOT_DIR = "c:/Users/manht/Documents/Data_in/temp_teacher"
extensions = ('.ts', '.tsx', '.json', '.md', '.html', '.js', '.mjs')

modified_files = []

for root, dirs, files in os.walk(ROOT_DIR):
    if 'node_modules' in dirs:
        dirs.remove('node_modules')
    if '.git' in dirs:
        dirs.remove('.git')
    if '.next' in dirs:
        dirs.remove('.next')

    for file in files:
        if file.endswith(extensions):
            file_path = os.path.join(root, file)
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()

                # Thay thế "Thầy Trương" -> "Thầy Đỗ Mạnh Trường"
                # Nhưng nếu đã là "Thầy Đỗ Mạnh Trường" thì không thay
                if "Thầy Trương" in content:
                    updated = content.replace("Thầy Trương", "Thầy Đỗ Mạnh Trường")
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write(updated)
                    modified_files.append(file_path)
            except Exception as e:
                print(f"Error {file_path}: {e}")

print(f"Đã cập nhật Thầy Đỗ Mạnh Trường trong {len(modified_files)} tệp tin.")
