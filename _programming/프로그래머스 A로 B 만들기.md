---
title: "프로그래머스 A로 B 만들기"
tags:
  - 프로그래머스, python
image:
  path: "images/프로그래머스로고.png"
  thumbnail: "images/프로그래머스로고.png"
---
url : [프로그래머스 A로 B 만들기](https://school.programmers.co.kr/learn/courses/30/lessons/120886)

#### 문제 설명
문자열 `before`와 `after`가 매개변수로 주어질 때, `before`의 순서를 바꾸어 `after`를 만들 수 있으면 1을, 만들 수 없으면 0을 return 하도록 solution 함수를 완성해보세요.


#### 예시 입출력
![](/images/2023-06-16-21-56-41.png){: width="40%"}

##### 제한사항
-   0 < `before`의 길이 == `after`의 길이 < 1,000
-   `before`와 `after`는 모두 소문자로 이루어져 있습니다.

#### 예시 입출력 설명
입출력 예 #1

-   "olleh"의 순서를 바꾸면 "hello"를 만들 수 있습니다.

입출력 예 #2

-   "allpe"의 순서를 바꿔도 "apple"을 만들 수 없습니다.

```
````

#### Code
```python
def solution(before, after):
    dict = {}
    strings = list(set(list(before)))
    # before 내의 어느 알파벳 수가 after 내의 동일 알파벳 수와 다르면 절대 불가
    for string in strings:
        if before.count(string) != after.count(string):
            return 0 

    return 1

```
