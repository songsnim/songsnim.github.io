---
title: "Pandas Unnamed:0 제거"
tags:
  - python, pandas
image:
  path: "images/판다스로고.png"
  thumbnail: "images/판다스로고.png"
---

pandas에서 데이터프레임에 column 뿐만 아니라 index에도 중요한 정보가 담겨 있을 것이라고 가정하기 때문에 사용자가 index를 고려할 것이라고 가정하고 동작한다. 하지만, 사용자는 index를 고려하지 않는 경우가 많다. 다음 예시를 보자.

##### 예시 1
```python
data = [[1,2,3],[4,5,6],[7,8,9]]
df = pd.DataFrame(data, columns=['a','b','c'])
print(df)
>>>
   a  b  c
0  1  2  3
1  4  5  6
2  7  8  9
```

이 데이터프레임을 csv 파일로 저장하고 다시 읽어보자.

```python
df.to_csv('new_df.csv')
new_df = pd.read_csv('new_df.csv')
print(new_df)
>>>
   Unnamed: 0  a  b  c
0           0  1  2  3
1           1  4  5  6
2           2  7  8  9
```

원래 데이터프레임에는 index를 사용자가 명시하지 않아 default로 0,1,2로 설정되어 있다. 따라서, csv 파일로 저장하고 다시 읽으면 0,1,2 열이 추가된다. 사용자가 index를 고려하지 않았으니 해당 정보의 컬럼명도 이름이 없다. 그래서 `Unnamed: 0`라고 이름이 붙는다. 이제 `Unnamed: 0`를 제거하기 위해 index를 고려하지 말라고 명시해주자.

```python
df.to_csv('new_df.csv', index=False)
new_df = pd.read_csv('new_df.csv')
print(new_df)
>>>
   a  b  c
0  1  2  3
1  4  5  6
2  7  8  9
```

`.to_csv`메서드에 `index=False` 옵션을 추가해 `Unnamed: 0`가 사라지고 의도한대로 데이터가 읽어진다. 


##### 예시 2
여기서 의문은, index에 중요 정보가 존재해서 사용자가 index를 고려해야한다고 의도하는 경우는 어떨까?

```python
data = [[1,2,3],[4,5,6],[7,8,9]]
df = pd.DataFrame(data, columns=['a','b','c'], index=['d','e','f'])
print(df)
>>>
   a  b  c
d  1  2  3
e  4  5  6
f  7  8  9
```

index에 특정 정보를 명시해준 상황이다.

```python
df.to_csv('new_df.csv')
new_df = pd.read_csv('new_df.csv')
print(new_df)
>>>
  Unnamed: 0  a  b  c
0          d  1  2  3
1          e  4  5  6
2          f  7  8  9
```

예시 1과 마찬가지로 `Unnamed: 0`가 추가되었다. 예시1과 동일하게 `index=False` 옵션을 추가해보자.


```python
df.to_csv('new_df.csv', index=False)
new_df = pd.read_csv('new_df.csv')
print(new_df)
>>>
   a  b  c
0  1  2  3
1  4  5  6
2  7  8  9
```

index를 고려하지 말라고 명시를 했으니, pandas는 정직하게 index에 존재하는 정보(d,e,f)를 무시하고 읽어왔다(0,1,2). 이런 경우에 `Unnamed: 0`도 방지하고, index 정보를 유지한 채로 읽어오는 방법은 저장은 그대로 하되, 읽어올 때 index로 읽어오도록 명시하는 것이다.

```python
df.to_csv('new_df.csv')
new_df = pd.read_csv('new_df.csv', index_col=0)
print(new_df)
>>>
   a  b  c
d  1  2  3
e  4  5  6
f  7  8  9
```

d,e,f 정보는 0번째 열에 있으므로, 0번째 열을 index로 명시해서 읽어오도록 하기위해 `index_col=0` 옵션을 추가해 index로 읽어오도록 했다. 

내 상황이 index를 무시해도 되는지, 고려 해야하는지를 생각해서, 저장할 때, `index=False`를 추가해 index를 무시하거나, 불러올 때 `index_col=0`을 추가해 index 열을 명시해주면 된다.

이제 index 정보를 유지하면서 `Unnamed: 0`도 방지할 수 있다!


