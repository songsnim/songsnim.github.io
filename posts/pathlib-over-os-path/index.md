---
title: "파이썬 경로 처리, os.path보단 pathlib"
date: 2025-07-14
tags:
  - "개발"
description: "경로를 문자열이 아닌 객체로 다루는 pathlib이 os.path보다 나은 이유."
draft: false
---
### 들어가며
window와 linux를 오가며 개발할 때 경로 구분자(`/`와 `\`)로 인한 에러와 복잡한 `os.path.join`, `os.path.dirname` 등으로 인해 골치 아프다면?  os.path를 버리고 pathlib을 사용해봅시다.

### pathlib 라이브러리
`pathlib`: "경로를 문자열이 아닌, **하나의 객체**로 다루는 패러다임"으로 설계한 라이브러리로써,
경로 자체를 '경로'에 관한 attribute와 method를 갖는 `Path` 객체로 다룹니다.

##### 예시 코드
```python
from pathlib import Path

_path = '/path/to/my/folder'
folder = Path(_path) # Path 객체 만들기

p = folder / 'dir' / 'file.txt' # 경로 결합
print(p.parent) # 'path/to/my/folder/dir
print(p.name) # 'file.txt'
print(p.stem) # 'file'
print(p.suffix) # '.txt'
print(p.exists()) # 파일 존재 여부 True or False
print(p.is_dir()) # 경로 여부
print(p.is_file()) # 파일 여부

## 경로 생성
Path(folder).mkdir(exist_ok=True) # 폴더 생성
p.touch() # 빈 파일 생성

## 파일 입출력
log_path = Path("./log.txt")
log_path.write_text("프로그램 종료\n", encoding='utf-8', mode='a')
content = log_path.read_text(encoding='utf-8')
print(content) # `프로그램 종료` 출력

...
```

##### `os.path` vs `pathlib`

| 기능  | `os.path` | `pathlib` |
|-------|-------|-------|
| 경로 결합 | os.path.join(base, 'dir', 'file.txt') val2 | Path(base) / 'dir' / 'file.txt' | 
| 부모 폴더 | os.path.dirname(p) |  p.parent|
| 파일 이름 | os.path.basename(p) |  p.name|
| 확장자 | os.path.splitext(p)[1] |  p.suffix|

##### 장점
- **높은 가독성**: os.path.join(path, 'dir', 'file.txt') 대신 path / 'dir' / 'file.txt'로 훨씬 직관적입니다.
- **OS 독립성**: window, macOS, linux 관계 없이 코드를 실행하면 pathlib이 알아서 OS에 맞게 처리합니다.
- **경로 모호성 제거**: `.resolve()` 메서드로 `../path/file.txt`같은 상대경로를 알아서 절대경로로 변경해 `logging.log`파일이나 `config.ini` 같은 파일의 경로를 코드상에서 완벽히 고정이 가능합니다.

##### 단점
- **호환성**: 오래된 라이브러리의 인자로 입력될 때, `str(p)`로 문자열 변환이 필요한 경우 존재합니다.

##### 실무 팁
1. **"경로는 객체다" 마인드셋**: 경로를 문자열로 보지 않고 객체로 인식하기
2. **슬래시(/)를 믿기**: Window에서 개발하더라도 `/` 사용 가능합니다.
3. **method chaining**: Path()로 생성된 경로는 객체이므로 method chaining으로 우아하게 코드 작성이 가능합니다.
```python
## 현재 디렉토리의 부모 폴더에 있는 'config.json'파일의 전체 절대경로를 얻는 코드
config_path = Path.cwd().parent.joinpath('config.json').resolve()
```
4. **상대경로 처리시 .resolve()** 떠올리기: 상대 경로(., ..)는 다른 위치를 가리킬 수 있어 버그의 원인이 되기 쉽습니다. 특히 설정 파일이나 로그 파일 경로는 my_path.resolve() 메소드를 사용하여 논쟁의 여지가 없는 완전한 절대 경로로 변환하여 사용하는 습관을 들이는 것이 좋습니다.

### 마치며
경로를 다루는 것은 잦고 불가피하지만 더 이상 운영체제마다 다른 경로 구분자나 `os.path`의 복잡함으로 인해, 예상치 못한 오류를 마주하며 시간을 낭비할 필요는 없습니다. 기존 코드에 흩어져있던 `os.path.join`을 `/` 슬래시로 바꿔보는 것부터 시작해보면 경로 처리 코드가 간단하고 우아해지는 것을 경험해볼 수 있습니다!
