---
create:: 2023-02-02 Thu 14:35:38
---
#코테  #python 
url : [코딩테스트 연습 - A로 B 만들기](https://school.programmers.co.kr/learn/courses/30/lessons/120886)
#### 문제 설명
>문자열 `before`와 `after`가 매개변수로 주어질 때, `before`의 순서를 바꾸어 `after`를 만들 수 있으면 1을, 만들 수 없으면 0을 return 하도록 solution 함수를 완성해보세요.

````col
```col-md
flexGrow=1
===
#### 예시 입출력
##### 제한사항
-   0 < `before`의 길이 == `after`의 길이 < 1,000
-   `before`와 `after`는 모두 소문자로 이루어져 있습니다.
![[Pasted image 20230204012750.png]]
```
```col-md
flexGrow=1
===
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

## Links
