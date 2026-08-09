---
title: "[ML] 경사하강법 수식으로 바닥부터 구현하기"
date: 2025-10-04
tags:
  - "ML"
description: "2층 신경망을 예로 경사하강법을 수식으로 전개하고 코드로 구현한다."
draft: false
---
이 글은 경사하강법의 개념을 이해하고 있으나, 디테일한 수식 전개 및 스크래치 코드를 눈으로 따라가보고 싶은 대상을 위해 작성되었습니다.
weight and bias가 각각 1개인 layer 2개로 이루어진 신경망을 예시로 경사하강법을 직접 수식으로 계산해본 후에 코드로도 구현해보겠습니다.

### 1. 셋업
학습 데이터: $(x,y)=(2,1)$
sigmoid: $\sigma(x)=\frac{1}{(1+e^{-x})}$ 
신경망: $f(x)=\hat{y}=\sigma (f_2(\sigma (f_1(x))))$

$x = x_1$
- 1-layer $f_1$
$z_1 = w_1*x_1 + b_1$
$w_1=0.5$
$b_1=0.1$

- 2-layer $f_2$
$z_2 = w_2*x_2 + b_2$
$w_2=0.4$
$b_2=0.2$

손실함수: $J=MSE=\frac{1}{2}(y-\hat{y})^2$

### 2. 순전파
#### 순전파 순서
입력 $>$ 1-layer $>$ sigmoid $>$ 2-layer $>$ sigmoid $>$ 신경망 출력

#### 계산
1. 1-layer에 입력 투입
$z_1=w_1*x_1 + b_1=0.5*2+0.1 = 1.1$ 
2. sigmoid로 다음 layer 입력인 activation $a_1$ 계산
$x_2=\sigma(z_1)= \frac{1}{(1+e^{-1.1})}\simeq 0.75$
3. 2-layer에 입력 투입
$z_2=w_2*x_2 + b_2=0.4*0.75+0.2 = 0.5$ 
4. 신경망 출력 계산
$\hat{y}=\sigma{(z_2)}=\frac{1}{(1+e^{-0.5})}\simeq 0.62$

### 3. 경사하강법
우리는 학습데이터 $(x,y)$가 주어졌을 때 신경망 출력 $\hat{y}$이 정답 $y$와 최대한 가깝게 되도록 학습되길 원한다. 
따라서 출력 $\hat{y}$와 정답 $y$ 간의 오차가 가장 적은 최솟점을 찾기 위해 미분값의 음의방향으로 파라미터(weight and bias)를 조금씩 업데이트 해야한다.

$$
\theta_{new}=\theta_{old}-\eta\frac{\partial J}{\partial \theta }
$$

$\eta$ : 학습률 (0.01)
$\theta$ : 파라미터 ($w_1, b_1, w_2, b_2$)

여기서 gradient(편미분 기호)는, 현재 시점에서 각 파라미터들이 최종 오차에 미치는 영향도로 해석할 수 있으며, 이 영향도를 기준으로 각 파라미터들을 업데이트하게 되면, local minima에 도달할 수 있다는 가정으로 모델을 학습하는 기법을 경사하강법이라고 한다.

local minima에 성공적으로 도달했다면 미분값이 0에 근접하게 되어 좁은 범위에서 진동하게 되고, 이를 학습이 수렴했다고 표현한다.

#### 3.1 loss 계산
- loss 계산
$J(\hat{y})=MSE=\frac{1}{2}(y-\hat{y})^2=\frac{1}{2}(1-0.62)^2\simeq0.0714$

#### 3.2 역전파 - chain rule로 gradient 계산
- 할일은 다음 4개의 gradient를 계산해야 한다.
$\frac{\partial J}{\partial w_2}, \frac{\partial J}{\partial b_2}, \frac{\partial J}{\partial w_1}, \frac{\partial J}{\partial b_1}$

#### 3.2.1. $\frac{\partial J}{\partial w_2}$

$$
\frac{\partial J}{\partial w_2}=\frac{\partial J}{\partial \hat{y}} \cdot \frac{\partial \hat{y}}{\partial z_2} \cdot \frac{\partial z_2}{\partial w_2}
$$

loss function $J$는 MSE이므로, $\hat{y}$에 대해 편미분하면 $\hat{y}-y$이다.

$$
\frac{\partial J}{\partial \hat{y}} = 0.62-1=-0.378
$$

$\hat{y}= \sigma (z_2)$ 이며, sigmoid의 편미분식은 $\hat{y}(1-\hat{y})$이다.

$$
\frac{\partial \hat{y}}{\partial z_2} = \hat{y}(1-\hat{y})=0.622(1−0.622) \simeq 0.235
$$

$z_2=w_2*x_2+b_2$ 이므로, $w_2$에 대한 편미분은 $x_2$이다. 따라서,

$$
\frac{\partial z_2}{\partial w_2}=x_2=0.75
$$

위 3개 편미분 값을 모두 곱하면,

$$
\frac{\partial J}{\partial w_2}=(−0.378)⋅(0.235)⋅(0.75) \simeq −0.0666
$$

#### 3.2.2. $\frac{\partial J}{\partial b_2}$

$$
\frac{\partial J}{\partial w_2}=\frac{\partial J}{\partial \hat{y}} \cdot \frac{\partial \hat{y}}{\partial z_2} \cdot \frac{\partial z_2}{\partial b_2}
$$

$z_2=w_2*x_2+b_2$ 이므로, $b_2$에 대한 $z_2$ 편미분은 $1$로 상수함수다.
따라서, 

$$
\frac{\partial J}{\partial b_2}=(−0.378)⋅(0.235)⋅(1) \simeq −0.0888
$$

#### 3.2.3. $\frac{\partial J}{\partial w_1}$

$$
\frac{\partial J}{\partial w_1}=\frac{\partial J}{\partial \hat{y}} \cdot \frac{\partial \hat{y}}{\partial z_2} \cdot \frac{\partial z_2}{\partial x_2} \cdot \frac{\partial x_2}{\partial z_1} \cdot \frac{\partial z_1}{\partial w_1}
$$

위 식에서 앞 2항은, 3.2.2에서 계산한 값을 재사용한다.

$z_2 = w_2*x_2+b_2$ 이므로,

$$
\frac{\partial z_2}{\partial x_2} = w_2=0.4
$$

$x_2=\sigma (z_1)$ 이므로,

$$
\frac{\partial x_2}{\partial z_1}= \sigma'(z_1)=x_2(1-x_2)=0.75*(1-0.75) = 0.1875
$$

$z_1=w_1*x_1 + b_1$ 이므로,

$$
\frac{\partial z_1}{\partial w_1}=x_1=2
$$

따라서, 

$$
\frac{\partial J}{\partial w_1}=(0.0888) \cdot (0.4) \cdot (0.1875) \cdot (2) \simeq -0.0133
$$

#### 3.2.4. $\frac{\partial J}{\partial b_1}$

$$
\frac{\partial J}{\partial b_1}=\frac{\partial J}{\partial \hat{y}} \cdot \frac{\partial \hat{y}}{\partial z_2} \cdot \frac{\partial z_2}{\partial x_2} \cdot \frac{\partial x_2}{\partial z_1} \cdot \frac{\partial z_1}{\partial b_1}
$$

앞의 4항은 3.2.3에서 계산한 값을 재사용하면, 

$$
\frac{\partial J}{\partial b_1}=(0.0888) \cdot (0.4) \cdot (0.1875) \cdot (1) \simeq -0.0067
$$

#### 3.2.5 경사하강법으로 파라미터 업데이트

$$
w'_1 = w_1 - \eta \frac{\partial J}{\partial w_1} = 0.5 - (0.01)(-0.0133) = 0.500133 \\
b'_1 = b_1 - \eta \frac{\partial J}{\partial b_1} = 0.1 - (0.01)(-0.0067) = 0.100067 \\
w'_2 = w_2 - \eta \frac{\partial J}{\partial w_2} = 0.4 - (0.01)(-0.0666) = 0.400666 \\
b'_2 = b_2 - \eta \frac{\partial J}{\partial b_2} = 0.2 - (0.01)(-0.0888) = 0.200888 \\
$$

위 식으로 우리가 학습하려는 신경망의 파라미터 4개$(w_1, b_1, w_2, b_2)$를 학습데이터 $(x,y)=(2,1)$로 경사하강법을 1 epoch 수행하여 새로운 파라미터 $(w'_1, b'_1, w'_2, b'_2)$로 이루어진 신경망을 얻게 되었다.

### 4. 코드로 구현하기
numpy를 쓰지 않고 내장 라이브러리인 math와 random만 사용해서 위 코드를 구현한다.

```python
import math

## --- 0. 활성화 함수 정의 ---
def sigmoid(x):
    """시그모이드 함수"""
    return 1 / (1 + math.exp(-x))

def sigmoid_partial(s):
    """시그모이드 도함수 (입력값은 이미 sigmoid를 거친 값)"""
    return s * (1 - s)

## ====================셋업=======================
## 학습 데이터
x = 2  # 입력
y = 1  # 정답

## 1층(Layer 1)의 가중치(w1)와 편향(b1)
w1 = 0.5
b1 = 0.1

## 2층(Layer 2)의 가중치(w2)와 편향(b2)
w2 = 0.4
b2 = 0.2

## 학습 설정
learning_rate = 0.1
epochs = 10000

x1 = x

## ====================학습=======================
for i in range(epochs):
    # ----------------순전파-------------------
    # 1-layer
    z1 = w1 * x1 + b1
    x2 = sigmoid(z1)
    
    # 2-layer
    z2 = w2 * x2 + b2
    yh = sigmoid(z2) # y_hat
	
    # 에러 계산
    error = 1/2*(y-yh)**2
    if i % 1000 == 0:
        print(f"Epoch {i}, Error: {error:.6f}, Prediction: {yh:.4f}")

    # ------------------ 역전파 -------------------
    # dJ/dw1, dJ/db1, dJ/dw2, dJ/db2 4개의 gradient를 구해야 한다.
    # Layer 2의 gradient (dJ/dw2, dJ/db2)
    dJ_dyh = (yh - y)
    dyh_dz2 = sigmoid_partial(yh)
    dz2_dw2 = x2
    dz2_db2 = 1
    
    dJ_dw2 = dJ_dyh * dyh_dz2 * dz2_dw2    
    dJ_db2 = dJ_dyh * dyh_dz2 * dz2_db2

    # Layer 1의 gradient (dJ/dw1, dJ/db1)
    dJ_dyh = (yh - y)
    dyh_dz2 = sigmoid_partial(yh)
    dz2_dx2 = w2
    dx2_dz1 = sigmoid_partial(x2)
    dz1_dw1 = x1
    dz1_db1 = 1
    
    dJ_dw1 = dJ_dyh * dyh_dz2 * dz2_dx2 * dx2_dz1 * dz1_dw1
    dJ_db1 = dJ_dyh * dyh_dz2 * dz2_dx2 * dx2_dz1 * dz1_db1

    # --------------- 경사하강법 ------------------
    w1 -= learning_rate * dJ_dw1
    b1 -= learning_rate * dJ_db1
    w2 -= learning_rate * dJ_dw2
    b2 -= learning_rate * dJ_db2


## 학습된 파라미터로 테스트
z1_test = w1 * x + b1
x2_test = sigmoid(z1_test)
z2_test = w2 * x2_test + b2
yh_test = sigmoid(z2_test)

print(f"\n입력(x): {x}, 실제 값(y): {y}")
print(f"학습 후 최종 예측 값: {yh_test:.4f}")

```

- 위 코드의 출력내용

```bash
Epoch 0, Error: 0.071259, Prediction: 0.6225
Epoch 1000, Error: 0.001667, Prediction: 0.9423
Epoch 2000, Error: 0.000773, Prediction: 0.9607
Epoch 3000, Error: 0.000497, Prediction: 0.9685
Epoch 4000, Error: 0.000364, Prediction: 0.9730
Epoch 5000, Error: 0.000287, Prediction: 0.9760
Epoch 6000, Error: 0.000237, Prediction: 0.9782
Epoch 7000, Error: 0.000201, Prediction: 0.9800
Epoch 8000, Error: 0.000175, Prediction: 0.9813
Epoch 9000, Error: 0.000154, Prediction: 0.9824

입력(x): 2, 실제 값(y): 1
학습 후 최종 예측 값: 0.9834
```

학습 전엥는 0.6225 정도로 정답인 1과 아주 먼 답을 내놓지만, 10000 epoch 학습이 수행된 이후에는 0.9834로 꽤 정답인 1과 근접한 답을 내놓는다.
