---
title: "[ML] MLE 관점에서 회귀와 분류 바라보기"
date: 2025-10-14
topics:
  - "ML"
description: "MSE와 CrossEntropy가 왜 각각 회귀·분류의 loss인지 MLE로 설명한다."
draft: false
---
이 글은 <a href='/posts/maximum-likelihood-estimation'>MLE</a>를 알고 있다고 가정하고 작성된 글입니다. 

---

ML의 기반이 되는 회귀와 분류는 각각 MSE와 CrossEntropy를 loss로 사용합니다. 그 이유에 대한 설명은 여러가지가 있을 수 있지만, 이 글에서는 MLE 관점에서 서술해보겠습니다. 결론부터 말하면, MLE로 회귀와 분류 문제를 바라보면 수학적으로 각 loss가 MSE와 CrossEntropy로 귀결됩니다.

## 1. 왜 회귀 loss는 MSE인가?
선형 회귀의 핵심 가정 중 하나는 **정규성**입니다.
> - 정규성
오차 $y - \hat{y}$은 정규분포를 따른다.

오차가 정규분포를 따른다는 가정을 세운 후에 회귀를 MLE로 풀어보겠습니다.
오차가 정규분포를 따른다는 말은, 실제 값 $y$가 예측값 $\hat{y}=W^Tx$를 평균으로 하는 정규분포를 따른다고 말과 같습니다.

$$
y∼\mathcal{N}(\hat{y}, \sigma^2)
$$

MLE를 위해 log-likelihood 함수를 세워보면,

$$
\mathcal{L}(y_i|x_i;W)=\sum_{i=1}^n \mathrm{log}(\frac{1}{\sqrt{2\pi\sigma^2}}e^{-\frac{(y_i-\hat{y}_i)^2}{2\sigma^2}})\\
\mathcal{L}(y_i|x_i;W)=\mathrm{log}(\frac{1}{\sqrt{2\pi\sigma^2}})-\sum_{i=1}^n{\frac{(y_i-\hat{y}_i)^2}{2\sigma^2}}\\=C-\frac{1}{2\sigma^2}\sum_{i=1}^n{(y_i-\hat{y}_i)^2}
$$

$\hat{y_i}$는 $x_i$에 대한 변수이므로 상수가 아님.

MLE를 수행하면,

$$
\underset{W}{\text{argmax}}\mathcal{L}(y_i|x_i;W)=\underset{W}{\text{argmax}}(\sum_{i=1}^n{(y_i-\hat{y}_i)^2})\\=\underset{W}{\text{argmax}}(\sum_{i=1}^n{(y_i-\hat{y}_i)^2})
$$

정규성이라는 회귀문제의 핵심 가정을 기반으로 MLE를 풀어보면 회귀문제는 자연스레 MSE를 최소화하는 문제로 귀결됩니다. 따라서, 회귀 용 ML모델 학습 시 loss로 MSE를 사용하는 것은 수학적인 근거가 있는 판단입니다.

## 2. 왜 분류 loss는 CrossEntropy인가?
계산의 편의를 위해 이진분류로 문제를 설정하겠습니다. 이진 분류에서는 결과가 0 또는 1이 발생합니다.
- $P(y=1|x)=\hat{y}$
- $P(y=0|x)=1-\hat{y}$

이 경우에는 결과값을 베르누이 분포로 모델링할 수 있습니다.

$$
P(y|x;W)=\hat{y}^y(1-\hat{y})^{1-y}
$$

이 가정을 바탕으로 log-likelihood 함수를 세워보면,

$$
\mathcal{L}(y_i|x_i;W)=\sum_{i=1}^n \mathrm{log}(\hat{y}^y(1-\hat{y})^{1-y})\\=\sum_{i=1}^n [y\mathrm{log}\hat{y}+(1-y)\mathrm{log}(1-\hat{y})]
$$

MLE를 수행하면,

$$
\underset{W}{\text{argmax}}\mathcal{L}(y_i|x_i;W)=\underset{W}{\text{argmax}}\sum_{i=1}^n [y\mathrm{log}\hat{y}+(1-y)\mathrm{log}(1-\hat{y})]
$$

해당 식은 BCE, `Binary Cross Entropy` 형태와 일치합니다.

결론적으로, 결과값이 베르누이 분포를 따른다고 가정하고 MLE를 수행하면 로지스틱 회귀(분류문제)는 자연스레 BCE를 최소화하는 문제로 귀결됩니다. 따라서, 분류 용 ML 모델 학습 시 CrossEntropy를 사용하는 것 역시 수학적 근거가 있습니다. 여기서 베르누이 분포 대신 카테고리 분포를 가정하면 다진 분류 문제로 바뀌며, 일반 CrossEntropy로 귀결되게 됩니다.
