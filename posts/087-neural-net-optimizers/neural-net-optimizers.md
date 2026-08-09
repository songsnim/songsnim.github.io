---
title: "[ML] Neural Net Optimizer 파헤치기"
date: 2025-10-10
topics:
  - ML
  - Math
description: SGD의 문제점에서 출발해 Momentum, RMSProp, Adam으로 이어지는 optimizer의 발전.
draft: false
---
이 글에서는 gradient descent가 어떤 문제점들을 갖고 있는지 파헤치고, 해당 문제점들을 해결하기 위해 어떻게 optimzer가 발전했는지를 살펴보겠습니다.

## 1. SGD(Stochastic Gradient Descent)
$\theta_{t}$: $t$ 시점에서의 모델 파라미터
$\eta$: learning rate
$\nabla J(\theta_t)$: 파라미터에 대한 loss gradient

$$
\theta_{t+1}=\theta{t}-\eta \nabla J(\theta_t)
$$

정석적인 gradient descent는 full batch(BGD)를 가지고 수행됩니다. 1회 순전파와 역전파를 수행할 때, train dataset 전체를 모두 입력한다는 의미입니다. 

하지만, 파라미터를 고작 1회 업데이트 하기 위해 train dataset 전체를 사용하는 짓은 비용이 너무 크기 때문에, train data sample을 일부만 사용하는 SGD 방법을 채택하게 됩니다. 
(data sample을 1개만 사용하면 SGD, n개를 사용하면 mini-batch gradient descent라고 부르지만, 의도적으로 구분지어 말하지 않는 경우 대부분 SGD는 mini-batch gradient descent를 포함한 의미이기 때문에, 이 글에서도 SGD로 퉁쳐서 이야기하겠습니다.)

batch_size를 32, 64, 128 정도로 설정하면 BGD에 비해 압도적으로 빠르게 학습을 수행할 수 있지만, 계산된 mini-batch gradient가 실제 gradient와 정확히 동일하지 않기 때문에 학습 수렴에 문제가 발생할 수도 있지 않을까? 하는 의문이 생길 수도 있습니다.

실제로는 모든 mini-batch의 gradient을 구해 평균을 매기면 실제 gradient와 수학적으로 동일할 수 밖에 없기 때문에 장기적으로는 동일한 방향으로 학습이 이루어집니다. 또한, SGD의 무작위성(noise)에 의해 오히려 regularization 효과를 기대할 수도 있습니다. BGD의 gradient는 매번 오직 하나의 방향으로 결정되어 있지만, SGD는 batch를 샘플링하는 방식에 따라서 매번 무작위성을 가지므로 마치 exploration하는 것처럼 동작해 더 일반적인 학습을 기대할 수 있습니다.

따라서, SGD는 거대한 데이터를 빠르게 학습할 수 있으며, '무작위성'의 특징이 더 나은 모델을 학습할 수 있는 부가효과도 있습니다.

## 2. SGD with Momentum
SGD에다가 `momentum`이라는 항을 추가해 보다 더 빠르게 수렴하도록 학습할 수도 있습니다.
기존 SGD는 현재 상태에서의 gradient만이 파라미터 업데이트에 관여합니다. 하지만 momentum은 이전에 발생한 gradient를 합산해 최적점을 향해 수렴하는 속도를 가속시킬 수 있습니다.

$v_t$: $t$ 시점에서의 속도
$\beta$: momentum

$$
v_{t+1}=\beta v_t + \eta \nabla J(\theta_t) \\
\theta_{t+1}=\theta_{t}-v_{t+1}
$$

위 식에서 momentum 계수인 $\beta$가 0인 경우 기존 SGD와 동일합니다.$\beta$가 1인 경우 지금까지 발생한 모든 gradient의 총합이 됩니다. 허나 과거의 모든 gradient의 총합을 사용하게 되면 역전파 횟수가 늘어나면서 gradient가 과도하게 커져 발산할 위험이 있기 때문에 
momentum 계수를 0.9나 0.99정도의 값을 줘서 오래 전 gradient는 서서히 없애는 방향으로 학습을 하는 것이 좋습니다.

#### SGD with momentum의 장점
1. 훨씬 빠른 수렴속도
아무래도 내리막을 타면 momentum으로 인해 가속이 붙기 때문에 훨씬 더 빠른 수렴 속도를 보이게 됩니다.

2. 더 안정적인 학습 곡선
SGD의 단점 중 하나인 '무작위성'에 의한 노이즈가 momentum에 의해 상쇄됩니다. 다른 mini-batch로 계산한 gradient가 게속 누적되기 때문에 '무작위성'에 의한 들쭉날쭉한 변동성이 보정되는 효과가 있어 학습 곡선이 더 부드럽고 안정적입니다.

3. 더 높은 learning rate 사용 가능
SGD는 현재 gradient만 사용하기 때문에 학습률에 매우 민감하지만, momentum 항이 추가되면 이전에 계산된 gradient에 의해 더 높은 학습률을 사용하더라도 역시 보정이 되는 효과가 있습니다. 이 때문에 더 높은 학습률을 사용하더라도 SGD에 비해 안정적으로 수렴합니다.

4. 모델 성능 향상
항상 그렇지는 않지만 SGD만 쓰는 것보다 성능이 비교적 좋을 때가 많습니다. 특히 SGD는 설정된 학습률 그 이하로 수렴하지 못해 minima 근처에서 진동하게 되는데, momentum 항은 gradient의 부호가 바뀌면 그대로 방향이 꺾이는게 아니라 기존 속도를 감속시키는 방향으로 가기 때문에 서서히 더 깊은 minima를 향해 수렴할 수 있으며, 결과적으로 더 나은 성능을 낼 수 있습니다.

## 3. NAG (Nesterov Accelerated Gradient)
momentum에 look-ahead라는 기법을 한스푼 추가한 optimizer입니다. 기존 momentum의 경우 실제로 현재 gradient의 부호가 바뀌어야 감속이 시작되는 구조입니다. 하지만 NAG는 현재 gradient가 아니라 그 다음 gradient를 미리 계산해 현재 가속도에 반영하도록 하여 불필요하게 멀리 갔다 되돌아오는 overshooting 현상을 줄여줍니다. 
직관적으로 비유하자면, 운전자가 충돌하기 전에 미리 브레이크를 밟는 것과 비슷합니다.

- 기존 Momentum

$$
v_{t+1}=\beta v_t + \eta \nabla J(\theta_t) \\\theta_{t+1}=\theta_{t}-v_{t+1}
$$

- NAG

$$
v_{t+1}=\beta v_t + \eta \nabla J(\theta_t-\beta v_t) \\\theta_{t+1}=\theta_{t}-v_{t+1}
$$

수식을 살펴보면 NAG의 경우 속도는 그대로지만, gradient(가감속하는 역할)를 계산할 때 현재 위치($\theta_t$)에서 계산하지 않고, 다음 스텝에 가게될 위치($\theta_t-\beta v_t$)에서의 gradient를 계산합니다. 
** $\beta v_t$를 더해야할 것 같지만, 학습의 목표지점이 gradient의 반대 방향에 있기 때문에 다음 스텝에 가게될 위치는 빼줘야 합니다.
추가로, $\theta_t$는 위치를 의미하는데, 속도를 막 빼줘도 되나 싶겠지만, 어차피 '1 step'다음 이기 때문에 속도 뒤에 1이 곱해져 있다고 생각하면 됩니다. $\theta_t-\beta v_t\times1$ 

#### NAG의 장점
미래의 gradient를 미리 계산해 가감속에 반영하기 때문에 momentum이 발산하거나 폭주하는 상황을 미연에 방지해 기존 momentum보다 더 안정적인 학습이 가능합니다.

## 4. Adagrad (Adaptive Gradient)
이미 업데이트가 될대로 되어 최적점 근처에 도착한 파라미터가 있을 것이고, 아직 최적점까지 갈길이 먼 파라미터가 있을 것입니다. 이 때, 최적점 근처에 도착한 파라미터는 gradient가 낮아야 수렴에 유리하며, 갈길이 먼 파라미터는 gradient를 키워 크게 크게 움직여야 더 빠르게 수렴할 수 있습니다. 이 아이디어를 녹여낸 optimizer가 Adagrad입니다.

- 기존 Momentum

$$
v_{t+1}=\beta v_t + \eta \nabla J(\theta_t) \\\theta_{t+1}=\theta_{t}-v_{t+1}
$$

- NAG

$$
v_{t+1}=\beta v_t + \eta \nabla J(\theta_t-\beta v_t) \\\theta_{t+1}=\theta_{t}-v_{t+1}
$$

- Adagrad

$$
g_t=\nabla J(\theta_t)\\G_{t+1}=G_t + g_t⊙g_t\\\theta_{t+1}=\theta_{t}- \frac{\eta}{\sqrt{G_t+\epsilon}}⊙g_t
$$

*⊙: element-wise 곱 (Hamadard product)

현재까지 gradient의 총합 $G_{t+1}$이 크다면, 현재 위치에서의 gradient가 작아진다. 현재까지 gradient의 총합 $G_{t+1}$이 작다면, 현재 위치에서 gradient가 증폭된다.

#### Adagrad의 장단점
- 장점
특정 형태의 데이터 샘플이 과하게 많거나, 적을 때 효과가 강력합니다. 예를 들어, NLP 모델을 학습할 때, a나 the, that 같은 단어의 빈도수는 매우 큰데, 등장할 때마다 파라미터를 계속 크게 업데이트하는 것은 불필요합니다. 또, 아주 드물게 나오는 단어의 경우에는 학습할 기회가 많지 않으므로 한번 학습할 때 크게 업데이트를 해놓아야 합니다.

- 단점
결국 $G_t$는 계속 커지기만 하므로 학습이 길어지면 학습률이 0에 근접해버리는 문제가 발생할 수 있습니다. 

## 5. RMSprop(Root Mean Square Propagation)
제프리힌턴이 Adagrad의 $G_{t+1}$가 일정 수준 이상 커지지 않게 하기 위해 고안한 optimizer입니다.

- Adagrad

$$
g_t=\nabla J(\theta_t)\\G_{t+1}=G_t + g^2_t\\\theta_{t+1}=\theta_{t}- \frac{\eta}{\sqrt{G_t+\epsilon}}⊙g_t
$$

** $g^2_t=g_t⊙g_t$, where $⊙$: element-wise 곱 (Hamadard product)

- RMSprop

$$
\mathbb{E}[g^2_t]=\gamma \mathbb{E}[g^2_{t-1}]+(1-\gamma)g^2_t \\ \theta_{t+1}=\theta_{t}- \frac{\eta}{\sqrt{\mathbb{E}[g^2_t]+\epsilon}}⊙g_t
$$

** $\gamma=0.9$ or $0.99$

만약 $G_{t+1}$가 계속해서 커지는게 문제라면, **현재까지의 mean of square of gradient에 root를 씌워** ($\frac{\eta}{\sqrt{\mathbb{E}[g^2_t]+\epsilon}}$) gradient에 곱해줘서 $G_t$가 무한정 커지는 대신 특정 범위(최근 평균) 내에 머물도록 유도하여 문제를 해결합니다.

이제 분모가 무한정 커지지도 않으면서, 최근 gradient의 behavior를 반영하여 Adagrad의 장점은 취하되, 단점을 해결하게 됩니다.

## 6. Adam(Adaptive Moment Estimation)
> Adam = momentum + RMSprop

RMSprop에 momentum을 추가해 양 쪽의 장점을 모두 취하는 optimizer입니다. 거의 대부분의 경우에 표준으로 사용되는 optimizer입니다.

#### 1차 momentum

$$
m_t=\beta_1 m_{t-1}+(1-\beta_1)g_t
$$

$m_t$: gradient의 1차 momentum (지수 이동 평균)
$\beta_1$: 1차 모멘텀의 decay (주로 0.9 사용)

#### 2차 momentum (RMSprop)

$$
v_t=\beta_2 v_{t-1} + (1-\beta_2)g^2_t
$$

$v_t$: gradient의 2차 momentum (지수 이동 평균)
$\beta_2$: 2차 모멘텀의 decay (주로 0.999 사용)

> 개인적으로 $v$와 $m$의 표기법이 뒤바뀐 것 같다는 생각이 들지만, Adam 논문에서 사용한 표기를 그대로 사용

#### 편향 보정
SGD나 RMSprop에서 현재 위치의 gradient를 바로 사용하는 것과는 다르게, $m_t$와 $v_t$는 현재까지의 gradient를 합산하여 사용합니다. 특히, 현재 gradient에는 $(1-\beta)$라는 아주 작은 계수만 붙어있는데, $m_{t-1}$과 $v_{t-1}$은 0에서 시작하기 때문에 학습 초기에는 $m_t$와 $v_t$가 0에 근접한 아주 작은 값에서 시작합니다. 이로 인해 학습 초기 최적점을 향해가는 속도가 아주아주 느린 문제가 발생합니다. 이 문제를 해결하기 위해 편향 보정을 사용합니다.

$$
\hat{m_t}=\frac{m_t}{1-\beta^t_1}\\
\hat{v_t}=\frac{v_t}{1-\beta^t_2}
$$

$t$가 작은 학습 초기에는 $m_t$값을 매우 크게 증폭시켜 학습 초기 gradient 값이 너무 작지 않도록 보정하고, $t$가 점점 커질수록 $\hat{m_t}$ 값이 plain $m_t$에 근접하도록 하여 해당 문제를 해결합니다.

> 이후 이 문제를 더 확실하게 해결하기 위해 RAdam이라는 optimizer가 소개되기도 함

#### 역전파

$$
\theta_{t+1}=\theta_t-\frac{\eta}{\sqrt{v_t}+\epsilon}\hat{m_t}
$$

현재 위치에서의 gradient 대신 momentum이 고려된 $m_t$를 사용하며, 이미 크게 업데이트 된 이력이 있는 파라미터는 작게, 갈 길이 먼 파라미터는 더 크게 gradient를 갖도록 $\frac{1}{\sqrt{v_t}+\epsilon}$을 사용해 adaptive한 학습을 가능케합니다.

## 7. 마무리
결국 optimizer는 다음 두 문제를 해결하면서 진화해왔습니다.
- 우리가 원하는 최적점이 아니라 local minima나 saddle point에 갇히지 않게 해야 한다.
- 훨씬 더 빠르게 학습이 수렴해야 한다.

아래 최적화 관련 논문에 따르면,
- Qualitatively Characterizing Neural Network Optimization Problem,  Ian J. Goodfellow, 2014
- Identifying and attacking the saddle point problem in high-dimensional non-convex optimization, Yann N. Dauphin, 2014
- Exploring Generalization in Deep Learning, Nitish Shirish Keskar, 2017

딥러닝 모델들이 찾는 최적점이 넓고 평평한 분지 지형이며, 초 고차원에서는 대체로 saddle point가 많다고 합니다. 결국 optimizer의 mission은 수많은 saddle point를 뛰쳐나와 넓고 평평한 최적점을 향해 달려나가는 일입니다. 이걸 떠올리면 optimizer의 진화과정에서 소개된 1차 momentum과 2차 momentum이 어떤 역할을 하는지 더 잘 이해할 수 있습니다.
