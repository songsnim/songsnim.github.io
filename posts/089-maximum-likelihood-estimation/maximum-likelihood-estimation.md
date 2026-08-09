---
title: "[ML] Maximum Likelihood Estimation"
date: 2025-10-14
topics:
  - ML
  - Math
description: probability와 likelihood의 차이에서 출발해 MLE를 수식으로 파헤친다.
draft: false
---
MLE(Maximum Likelihood Estimation, 최대우도추정법, 최대가능도추정법)는 모델의 파라미터를 추정하는 기법입니다. 이 글에서는 수식과 함께 MLE를 파헤쳐보겠습니다.

## 1. Probability vs. Likelihood
MLE를 이해하기 위해서는 likelihood를 알아야하는데 특히, probability와의 차이를 이해하는 것이 중요합니다. 헷갈리는 포인트 중 하나는 동일한 확률 분포를 가지고 두 개념이 설명된다는 점 때문인데, 차이를 이해하기 위한 가장 쉬운 방법은 **관점이 다르다**입니다.
- Probability - 파라미터(모델)가 고정되어 있을 때, 해당 데이터가 관측될 가능성
	예시) 동전($\theta$=0.5)가 주어졌을 때, '앞-뒤-앞' 순서로 나올 가능성은?
- Likelihood - 데이터가 고정되어 있을 때, 해당 파라미터(모델)가 생성했을 가능성
	예시) '앞-뒤-앞'라는 결과가 관측되었을 때, 동전의 $\theta$가 0.5일 가능성은?

정확히 관점의 순서가 뒤바뀐 개념이라고 생각하면 됩니다. 저는 probability는 연역적이고, likelihood는 귀납적이라고 생각하는 편입니다.

## 2. likelihood 정의
$n$개의 데이터 포인트 $X=\{x_1, x_2, \dots, x_n\}$가 i.i.d(independent and identically idstributed)를 따른다고 가정합시다. 이 때, 파라미터 $\theta$로 모델링되는 확률 분포 $f$에서 데이터셋 $X$가 관측될 joint probability는 각 데이터 포인트의 확률 질량(혹은 밀도) 함수의 곱이 바로 likelihood 함수입니다. 

$$
L(\theta|X)=P(X|\theta)=\prod_{i=1}^nP(x_i|\theta)
$$

MLE의 목표는 이 likelihood를 최대로 만드는 파라미터 $\theta$를 찾는 것입니다.

$$
\theta_{MLE} = \underset{\theta}{\text{argmax}}L(\theta|X) =\underset{\theta}{\text{argmax}}\prod _{i=1}^n P(x_i|\theta)
$$

## 3. log-likelihood
likelihood 함수는 확률의 곱으로 이루어져 있기 때문에 미분 계산이 매우 복잡합니다. 로그함수는 단조 증가 함수이기 때문에 최댓값을 찾을 때 함수에 로그를 씌워도 무방합니다.

$$
\underset{\theta}{\text{argmax}}L(\theta|X)=\underset{\theta}{\text{argmax}}\space\mathrm{log}(L(\theta|X))
$$

$$
\mathcal{L}(\theta|X)=\mathrm{log}(\prod _{i=1}^n P(x_i|\theta))=\sum_{i=1}^n \mathrm{log}P(x_i|\theta)
$$

## 4. MLE 계산
log-likelihood를 최대화하는 $\theta$를 찾기 위해서는 편미분값을 0으로 만드는 $\theta$를 찾으면 됩니다.

#### 예제: 정규분포의 평균 추정
우리가 관측한 데이터 포인트 $X$가 어떤 정규분포($\mathcal{N}(\mu, \sigma^2)$)에서 나왔는지 알고 싶습니다. 해당 정규분포의 파라미터 중에서 '평균'($\theta=\mu$)을 우리가 얻은 데이터 포인트 $X$로 추정하고자 합니다.

$$
\mathcal{L}(\mu|X)=\sum_{i=1}^n \mathrm{log}(\frac{1}{\sqrt{2\pi\sigma^2}}e^{-\frac{(x_i-\mu)^2}{2\sigma^2}}) \\
=\sum_{i=1}^n  [\mathrm{log}(\frac{1}{\sqrt{2\pi\sigma^2}})\\
- {\frac{(x_i-\mu)^2}{2\sigma^2}}]\\
=C-\frac{1}{2\sigma^2}\sum_{i=1}^n(x_i-\mu)^2
$$

지금 우리가 관심있는 파라미터는 $\mu$이므로 $\mu$와 관계없는 항은 상수항으로 취급합니다.

$$
\frac{\partial{\mathcal{L}}}{\partial\mu}=\frac{1}{2\sigma^2}\sum_{i=1}^n(x_i-\mu)=0
$$

$1/2\sigma^2$는 0이 아니므로 summation이 0이 되어야 합니다. 따라서, 

$$
\sum_{i=1}^n(x_i-\mu)=0 ⟹ \sum_{i=1}^nx_i-n\mu=0
$$

$$
\mu_{MLE}=\frac{1}{n}\sum_{i=1}^nx_i
$$

결론적으로, 우리가 관측한 데이터를 생성한 모델이 정규분포라고 가정했을 때, 그 정규분포의 평균을 추정하는 방법은 likelihood를 최소로 만드는 평균을 찾는 것이고, 그 평균이 바로 표본평균과 정확히 일치함을 수학적으로 증명하였습니다.

## 5. 결론
MLE는 관측된 데이터에서 역으로 모델을 추정하는 수학적인 기법으로, 수집한 데이터의 패턴을 따르는 하나의 모델을 찾으려는 기계학습의 목표와 아주 밀접한 관련이 있습니다. 실제로 MSE와 cross-entropy 같은 loss들이 MLE로 유도되기도 합니다. 이 주제는 다음 글에서 다루도록 하겠습니다.
