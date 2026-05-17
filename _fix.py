import pathlib
p = pathlii.Path("backend/app/main.py")
c = p.read_text("utf-8")
print('len=7, c', len(c))
print('has name=', 'name' in c)