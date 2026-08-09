---
title: "[ML] MAP관점에서 regularization 바라보기"
date: 2025-11-02
tags:
  - "ML"
description: "L1·L2 규제를 MAP 추정의 사전분포로 해석한다."
draft: false
---
선형 회귀 모델에서 사용되는 대표적인 규제(regularization) 기법인 L1과 L2 규제가 MAP관점에서 어어떻게 해석되는지 살펴보겠습니다. 기본적인 L1과 L2를 알고 있다고 가정하고 작성된 글입니다.

## 1. MLE 다시보기
MLE(Maximum Likelihood Estimation)은 우리가 관심있는 분포($\theta$)를 모를 때, 관측된 데이터 $D$를 가지고 해당 분포를 추정하는 방식입니다. (가우시안 분포임을 가정하면 $\theta=(\mu,\sigma)$가 될 것입니다.) Likelihood가 $P(\theta | D)$라면, MLE로 추정한 파라미터 $\hat\theta$은 아래처럼 구성됩니다.

$$
\hat\theta = \underset{\theta}{\text{argmax }}P(D | \theta)
$$

해당 MLE 식을 해석하면, 데이터의 분포 $D$를 어떤 파라미터 $\theta$로 표현해야 likelihood $P$가 가장 커지는지를 묻는 문제입니다. likelihood가 가장 커지는 $\theta$를 찾는다는 것은, 실제 데이터 분포 $D$를 가장 잘 추정했다는 의미입니다. 따라서, **MLE의 목표는 단 하나, likelihood를 최대화**하는 것입니다. 어떤 제약사항이나 가이드도 없이 그저 자유롭게 데이터 분포를 추정하기만하면 됩니다.

## 2. MAP(Maximum A Posteriori)
베이지안 추론 식을 위 setup으로 작성해보면,

$$
P(\theta|D) = \frac{P(D|\theta)P(\theta)}{P(D)}
$$

좌항인 $P(D|\theta)$은 posterior(사후확률)이며, 우항에서 $P(\theta|D)$가 likelihood입니다. $P(D)$와 $P(\theta)$는 각각 prior(사전확률)과 evidence(증거)입니다. 베이지안 추론에서 posterior를 구한다는 의미는, evidence와 likelihood를 활용해 원래 갖고 있던 prior(믿음 혹은 가정)를 업데이트한다는 의미입니다.

여기서 MAP는 아래처럼 구성되며, MLE 식에서 $\theta$와 $D$의 위치가 뒤바뀐 형태입니다.

$$
\hat\theta = \underset{\theta}{\text{argmax }}P(\theta | D)
$$

베이지안 추론 식으로 MAP를 다시 작성하면, $\underset{\theta}{\text{argmax }}P(D|\theta)P(\theta)$로 바꿔쓸 수 있습니다. 
(분포 $P(D)$는 고정된 상수이기 때문에 argmax에서 빠져도 무방합니다.)

따라서, MAP는 likelihood에 prior를 곱한 값을 최대화하는 $\theta$를 찾는 문제입니다. 그렇다면, prior가 곱해졌다는 건 무슨 의미인지 해석해보겠습니다.

#### 오컴의 면도날

> 모든 요소가 동일할 때, 가장 단순한 설명이 최선이다.

이 오컴의 면도날을 ML모델에 적용해보면, **모델이 가급적 간단해야 좋은 모델이다** 라고 말할 수 있습니다. 만약, 우리가 **간단한 모델이 좋은 모델이다** 라는 가정을 사전에 믿고 있다면(혹은 가정을 삼는다면), 어떻게 수학적으로 표현할 수 있을까요? 피쳐의 수가 적을 수도 있고, 신경망이라면 깊이나 너비가 작을 수도 있습니다만, MLE나 MAP의 경우에는 이미 가정한 분포의 파라미터 $\theta$를 찾는 상황이기 때문에 분포 자체를 간단하게 만들 수는 없습니다. 따라서, **$\theta$의 값이 사라지거나, 작을 수록 좋다** 라는 prior(믿음 혹은 가정)을 기반으로 $\theta$를 찾아야 하는 상황인겁니다.
따라서, 우리의 prior를 분포로 표현하면, **$\theta$가 평균이 0인 가우시안 분포를 따를 것이다.** 라는 가정으로 바꿔 말할 수 있습니다. 

$$
\theta∼\mathcal{N}(0, \sigma^2)
$$

MAP를 위해 log-posterior 식을 세워보면,

$$
\mathcal{L}(\theta|D)=\mathrm{log}P(D|\theta)+\mathrm{log}P(\theta)\\
=\mathrm{log}P(D|\theta)+\mathrm{log}(\frac{1}{\sqrt{2\pi\sigma^2}}e^{-\frac{\theta^2}{2\sigma^2}})\\
=\mathrm{log}P(D|\theta)+\mathrm{log}(\frac{1}{\sqrt{2\pi\sigma^2}})-{\frac{\theta^2}{2\sigma^2}}\\=\text{MSE loss} + C-\lambda\theta^2
$$

따라서, 

$$
\underset{\theta}{\text{argmax }}P(\theta | D)
$$

를 풀기 위해 MLE처럼 log-posterior로 변형한 후 우리의 prior(**$\theta$가 평균이 0인 가우시안 분포를 따를 것이다.**)를 반영하면, 자연스럽게 우리가 아는 L2 규제항을 갖도록 loss함수가 구성되는 것을 확인할 수 있습니다.

## 3. 결론
MLE는 아묻따 우리가 찾으려는 분포 $D$를 가장 잘 설명하는 $\theta$를 찾기만 하면 됩니다. 하지만, MAP는 "우리는 이미 간단한 모델이 더 낫다"라는 믿음을 반영하여 $\theta$를 찾는 과정입니다. 간단한 모델이라면 평균이 0인 가우시안 모델을 따를 것이므로, 가급적이면 $\theta$의 값이 0에 가까워지도록 학습이 유도되게 됩니다. 결국 우리가 잘 알고 있는 L2 규제 형태를 보이게 되고, 규제가 overfitting을 방지하는 역할을 하는데, 이는 오컴의 면도날(overfitting 완화)이라는 가정에 충실하게 학습이 이루어진 것이라고 볼 수 있습니다.
