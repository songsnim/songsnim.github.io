---
title: "[python] 타입 힌트 시 따옴표를 쓰는 이유"
date: 2025-09-11
tags:
  - "개발"
description: "순환 참조와 자기 클래스 타입힌트에서 따옴표(전방 참조)를 쓰는 이유."
draft: false
---
## 1. 타입 힌트 시 따옴표를 쓰는 이유
어느 정도 규모있는 파이썬 프로젝트를 수행하기 시작하면 객체 간 메시지의 타입을 명시하기 위해(혹은 일관된 입출력을 위해) 타입힌트를 필수적으로 사용하게 됩니다. 이럴 때 메서드를 작성하다보면, 순환 참조의 문제라던지, 출력이나 입력의 타입이 본인 클래스인 경우가 생길 수 있습니다. 
```python
class MyClass:
    def update(self, item: MyClass) -> MyClass:
        ...
        return new_item
```

위 클래스가 정의될 때, 타입 힌트 부분에서 
```
NameError: name 'MyClass' is not defined
``` 
해당 에러가 발생하게 됩니다. 
아직 MyClass가 정의되지 않았는데 미리 사용하기 때문에 발생합니다.

이를 전방 참조라고 부르며, 따옴표를 사용하여 해당 문제를 해결할 수 있습니다. 
```python
class MyClass:
    def update(self, item: 'MyClass') -> 'MyClass':
        ...
        return new_item
```

## 2. `from __future__ import annotation`
따옴표를 사용해서 문제가 해결되긴 하지만, 코드 규모가 커지면 전방 참조가 발생할만한 곳만 일일이 찾아서 따옴표를 붙이는 것이 번거로우며, 코드 자체에도 가독성 관점에서 군더더기가 발생하게 됩니다.

이 문제를 개선하기 위해 파이썬 3.7부터 `from __future__ import annotation` 구문이 등장합니다. 파일 상단에 해당 구문을 추가하면 모든 타입힌트를 기본적으로 문자열로 처리하도록 만들어 자동으로 전방참조 문제를 해결합니다.

```python
from __future__ import annotation

class MyClass:
    def update(self, item: MyClass) -> MyClass:
        ...
        return new_item
```

## 3. 파이썬 3.11 이후부턴 기본 동작
```from __future__ import annotation``` 이 조차도 파일 상단에 적는게 귀찮았던건지 이런 추가적인 구문을 작성하지 않더라도 기본 동작으로 탑재되어 알아서 전방참조 문제를 해결하게 업데이트 되었습니다.
