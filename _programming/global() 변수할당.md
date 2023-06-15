---
title: "Python global() 동적 변수 할당"
tags:
  - python
image:
  path: "images/파이썬로고.png"
  thumbnail: "images/파이썬로고.png"
---

## 사용처
`global()` 함수는 전역변수를 할당하는 함수로, 변수명을 문자열로 받아 해당 변수에 값을 할당한다.
변수명을 문자열로 받기 때문에 문자열 포매팅을 활용해 loop안에서 동적으로 변수 할당할 때 사용할 수 있다.

## Code
```python
names = ['jane', 'tom', 'mike', 'chris']
heights = [164, 180, 176, 189]
for name, height in zip(names, heights):
    globals()[f'height_of_{name}'] = height

for var in list(vars().keys()):
    if 'height_' in var:
        print(f"{var} = {vars()[var]}")

"""출력 결과:
height_of_jane = 164
height_of_tom = 180
height_of_mike = 176
height_of_chris = 189
"""
```
