---
title: "Python walrus operator"
tags:
  - python
image:
  path: "images/파이썬로고.png"
  thumbnail: "images/파이썬로고.png"
---

![](/images/walrus.png){: width="50%"}

Walrus operator는 python 3.8 버전에 새로 추가된 문법이다. `:=`로 표현하며, 바다코끼리(walrus)를 닮아서 `walrus operator`라고 부른다. 표현식(expression) 내에서 변수에 값을 할당할 수 있는 역할을 한다. 코드 간소화와 가독성 향상에 도움을 주고 그 외 특정한 경우에 유용하게 사용할 수 있다.

#### walrus 문법
```python
x = 10
print(x) # 10
```
```python
print(x := 10) # 10
```
위 두 코드는 완벽히 동일하게 동작한다. 하지만 walrus operator는 표현식 내에서 동시에 변수를 할당할 수 있기 때문에 코드가 간소화된다.


#### 코드 간소화 및 가독성 향상

```python
arr = [x for x in range(11)]

# 주어진 arr내 원소 갯수가 10개 이상인지 판단하는 코드
if len(arr) > 10:
    print(f"Arr is too long ({len(arr)} elements, expected <= 10)")
else:
    print(f"Our arr is fine ({len(arr)} elements, expected <= 10)")
```
코드가 짧고 간결하지만, `len(arr)`를 여러 번 호출하고 있다. 보통 여러번 호출하는 것을 막기 위해 다음과 같이 코드를 작성한다.

```python
n = len(arr)
if n > 10:
    print(f"Arr is too long ({n} elements, expected <= 10)")
else:
    print(f"Our arr is fine ({n} elements, expected <= 10)")
```
여러번 호출하지 않는 것에는 성공했지만 하지만 이것도 `n = len(arr)`이라는 코드가 한 줄 추가되므로 코드가 길어진다. 더군다나 코드를 쭉 읽다가 `n = len(arr)`를 맞닥뜨리는 순간 다음 코드를 읽기 전까지 왜 `n`에 할당이 필요한지 직관적으로 알 수 없다. 이 때 walrus operator를 사용해 코드를 더욱 간결하고 직관적으로 작성할 수 있다.

```python
if (n := len(arr)) > 10:
    print(f"Arr is too long ({n} elements, expected <= 10)")
else:
    print(f"Our arr is fine ({n} elements, expected <= 10)")
```
walrus operator를 쓰는 순간 `n = len(arr)`가 삭제되어 코드가 간결해졌다. `len()`을 여러번 호출하지도 않고, 코드도 가장 짧으며, `n`이라는 변수가 어떤 역할을 하는지도 바로 알 수 있다. 더 이상 `n = len(arr)`를 읽고 다음 코드를 읽기 전까지 왜 `n`에 할당이 필요한지 한박자 고민할 수고가 덜어졌다.

위의 3 코드 스니펫은 동일하게 동작하지만, walrus operator가 코드 간소화와 가독성 향상에 도움을 주고 있다.

#### While loop 조건문에서 사용
Walrus operator는 특히 while loop를 끝내는 조건문에서 사용되는 값이 loop 내에 다시 사용되는 경우 유용하다. 다음 예시를 보자.

 
```python
# arr의 원소를 하나씩 빼면서 그만큼 x를 감소시킬 때, x가 음수가 되면 loop를 종료하는 코드
arr = [3,2,7,1,4,5]
x = 10
while x >= 0:
    """ 
    
    Do something
    
    """
    x -= arr.pop(0)

print(x) # -2
```

하지만 while loop를 끝내는 조건문에서 사용되는 x가 loop 마지막에서 다시 사용되고 있다. loop를 끝내는 조건을 판단하는 코드가 while 줄과 loop 맨 마지막에 떨어져 있다. 이 때 walrus operator를 사용하면 해당 조건을 while문 안으로 모두 가져올 수 있다.

```python
arr = [3,2,7,1,4,5]
x = 10
while (x := x - arr.pop(0)) >= 0:
    """ 
    
    Do something
    
    """

print(x) # -2
```
walrus를 사용하여 loop를 끝내는 조건과 관련된 정보를 while 줄 한 곳에 모아놓았다. 이렇게 하면 loop를 끝내는 조건을 한 눈에 알아볼 수 있고, loop 내에서는 어떤 일이 일어나는지에만 집중할 수 있다. 단, `x -:= arr.pop(0)' 이라던지 `x :-= arr.pop(0)`같은 산술 후 대입을 하지는 못한다.

#### list comprehension에서 사용
list comprehension의 필터링 조건에 사용하는 값이 표현식에도 필요한 경우 walrus operator를 사용해 아주 간결하게 코드를 작성할 수 있다.


```python
# 방문자 중 풀네임이 초대명단에 있으면 풀네임이 담긴 배열로 반환하는 코드
visitors = ['John', 'Smith', 'Isabella', 'Mike', 'Chris', 'Duncan']
invited = ['Evangeline', 'Johnson', 'Christina']

fullnames = [full(name) for name in visitors]
print([name for name in invited if name in fullnames])
# [Johnson, Christina]
```
위 코드는 list comprehension을 활용하여 최대한 간결하게 작성한 코드다. 하지만 walrus operator를 사용하면 이걸 더 간결하게 작성할 수 있다.

```python 
print([full_name for name in visitors
        if (full_name := full(name)) in invited])
# [Johnson, Christina]
```
방문자 중 풀네임이 초대명단에 있으면 풀네임이 담긴 배열로 반환하는 코드다. 단 한줄로 표현이 가능하다.


상황에 따라 코드를 더 간결하고 직관적으로 작성할 수 있는 walrus operator를 알아 보았다.
개인적으로 3가지 예시 중에서는 특히 while loop에 유용하게 사용할 수 있다고 생각한다.

## Refernece
https://docs.python.org/3/whatsnew/3.8.html
https://www.youtube.com/watch?v=W0TVAYmznWU






