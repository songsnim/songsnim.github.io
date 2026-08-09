---
title: "Path.resolve()를 써야하는 이유"
date: 2025-07-16
topics:
  - "Dev"
description: "상대 경로의 모호함이 만드는 FileNotFoundError와 Path.resolve()의 역할."
cover: "./cover.jpg"
draft: false
---

![](./cover.jpg)

잘 동작하던 파이썬 코드가 분명 같은 컨테이너인데도 협업 중인 다른 개발자가 돌리면 FileNotFoundError를 뿜으며 코드가 죽는 상황이 발생합니다. 이 경우는 높은 확률로 **경로의 모호성** 때문에 발생합니다.
`pathlib.Path.resolve()`가 단순한 편의 기능을 넘어 왜 견고한 소프트웨어의 필수 요건인지 알아보겠습니다.

### 원인: 상대 경로의 모호함
문제의 시작은 대부분 상대 경로(.., .)입니다. 상대 경로는 매우 편리하지만, **'현재 작업 디렉토리(Current Working Directory, CWD)'** 가 어디냐에 따라 가리키는 실제 위치가 달라지는 치명적인 단점이 있습니다.

신입사원 N씨는 다음과 같이 AI 모델 학습 스크립트를 작성했습니다.
```bash
/home/user/my_project/
├── configs/
│   └── training_config.yaml
└── scripts/
    └── train.py
```
N씨는 train.py에서 설정 파일을 불러오기 위해 아래와 같이 코드를 작성했습니다.

```python
## train.py (나쁜 예)
from pathlib import Path

## 설정 파일 경로
CONFIG_PATH = Path("../configs/training_config.yaml")

def main():
    # 설정 파일을 읽는다
    config = load_config(CONFIG_PATH)
    # ... 학습 진행 ...
```

N씨가 자신의 컴퓨터(`/home/user/my_project/scripts/` 폴더)에서 `python train.py`를 실행했을 때는 아무런 문제가 없었지만 사내 학습 파이프라인에 올리자마자, 스크립트는 `FileNotFoundError`를 내며 실패했습니다.

왜일까요? 자동화 시스템(Jenkins, GitHub Actions 등)은 코드를 `/var/lib/jenkins/workspace/temp_123/`과 같이 전혀 다른 임시 폴더에서 실행시키기 때문에 해당 위치에서 `../configs`는 존재하지 않는 경로이기 때문입니다.

### 해결책: Path(\__file\__).resolve()
`Path.resolve()`는 어떤 형태의 경로든 **'절대 경로'**로 변환해줍니다. 여기서 핵심은 현재 실행되는 스크립트 파일(__file__)의 위치를 기준으로 절대 경로를 만드는 것!

```Python
## train.py (좋은 예)
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent

CONFIG_PATH = SCRIPT_DIR.parent / "configs" / "training_config.yaml"

def main():
    # 전 세계 어떤 machine에서 실행하든 반드시 동일한 경로를 사용
    config = load_config(CONFIG_PATH)
    # ... 학습 진행 ...
```
이 코드는 train.py 파일이 어디에 있든, 그 파일의 위치를 기준으로 configs 폴더를 찾아가기 때문에, 더 이상 스크립트를 실행하는 위치(cwd)에 의존하지 않습니다. 실제로 pathlib을 주요 경로 라이브러리로 사용하는 오픈소스들을 뜯어보면 Path(\__file\__).resolve().parent 라는 구문을 사용하는 경우를 종종 볼 수 있습니다.

### 추가 팁
##### 설정 및 로그 파일에 사용
클래스의 `__init__`이나 설정 관리 모듈에서 경로를 정의할 때, 습관적으로 `.resolve()`를 붙여 절대 경로로 변환하여 사용하세요.

##### 외부 프로세스와 상호작용할 때는 `str(path.resolve())`
파이썬 스크립트에서 다른 커맨드라인 도구나 서브프로세스를 호출할 때, 이때 상대 경로를 그대로 넘기면 외부 프로그램이 경로를 잘못 해석할 수 있습니다. `str(my_path.resolve())` 형태로 완전한 절대 경로를 문자열로 변환하여 전달하는 것이 가장 안전합니다.

##### 사용자 입력을 `resolve(strict=True)` 한 줄로 검증
사용자로부터 파일 경로를 입력받는 기능이 있다면, 그 경로가 실제로 존재하는지 확인해야 합니다. 이때, `Path(user_input).resolve(strict=True)`를 사용하면 해당 경로에 파일이나 폴더가 존재하지 않는 경우 `FileNotFoundError`가 발생하므로, 존재 여부 확인과 절대 경로 변환을 한 번에 처리할 수 있습니다.

##### DB에 경로를 저장할 때 사용
DB에 데이터셋의 경로를 설정하는 경우 ~/share/data와 같은 상대적인 경로가 아니라 항상 `resolve()`로 변환된 완전한 절대 경로를 저장하는 것이 원칙입니다.

### 마치며
`Path.resolve()`는 내 개발 환경을 벗어나, 복잡하고 예측 불가능한 서버 환경에서 실행될 때도 **안정적으로 동작할 것임을 보장하는 '방어적 프로그래밍'**을 위한 도구 중 하나입니다.
