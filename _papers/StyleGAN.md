---
title: "[StyleGAN 리뷰1] Style-based generator"

image: 
  path: /images/2023-06-25-17-32-17.png
  thumbnail: /images/2023-06-25-17-32-17.png
---

"A Style-Based Generator Architecture for Generative Adversarial Networks" 논문을 읽고 정리한 글입니다. 디테일한 수식이나 dimension은 최소화하고, 큰 틀에서 StyleGAN을 이해하기 위한 글입니다.

## 1. Introduction
이 논문에서 제안하는 StyleGAN은 다음과 같은 강점을 갖는다.

- 기존 GAN과 다른 input system을 설계해서 disentangled attributes의 세기를 scale별로 제어할 수 있게 함
- Noise injection으로 stochastic variation 학습을 attributes 학습으로부터 분리
- Interpolation과 disentanglement quality를 정량적으로 측정하는 새로운 평가 방법 제안
(Perceptual path length, linear separability)
- 기존 GAN보다 우수한 퀄리티의 이미지 생성

마지막으로, 새로 제작한 FFHQ 얼굴 데이터셋을 공개한다.

> StyleGAN은 기존 GAN에서 input latent code가 하던 역할을 명시적으로 [Learned constant input, style vector, noise injection]로 나누어 학습해 disentangled attributes 학습과 stochastic variation 학습의 퀄리티를 높일 수 있다. 역할을 나누어서 학습하는 경우 생성 이미지의 퀄리티가 낮아질 것이라 생각할 수 있지만, 실험 결과 기존 input layer를 버리고 constant input, style, noise를 모두 사용하는 경우 FID 지표가 가장 높은 것을 확인했다. (물론 mapping network와 AdaIN의 사용도 한 몫 하긴 했음.)

## 2. Style-based generator
![](/images/2023-06-25-17-55-52.png){: width="70%"}

**그림 1. Input 구조 비교**

기존 GAN과 비교했을 때 unput system이 어떻게 변화했는가? 
##### 2.1 Constant input
기존 GAN은 이미지 생성을 제어하는 latent code가 input layer에 feed forward 방식으로 들어온다.
이 방식은 input latent space가 학습 데이터의 확률 분포를 따르게 되므로 entanglement를 피할 수가 없다.
따라서, StyleGAN은 input layer로 learned constant input을 사용하고, latent code를 중간 layer마다 집어넣는 방식을 사용한다. Learned constant input은 학습할 떄는 Gaussian noise parameter로 시작해 학습을 하지만, inference 시에는 학습이 끝난 고정된 값을 사용한다.

> Constant input은 training dataset의 아주 개략적인 특성을 담은 '밑그림' 역할을 한다. 만약 얼굴 데이터셋으로 학습을 한다면, 4x4 constant input의 가운데 4칸은 얼굴 생성을 위한 '밑그림' 혹은 'starting point'가 된다. 그러니까, 중앙 4칸은 평균적인 살색을 담고 있을 것이고, 가운데 위 2칸은 평균적인 머리 색깔을 담고 있을 것이다. 이렇게 constant input이 학습 데이터의 아주 개략적인 특성을 담도록 학습되기 때문에, latent code가 학습 데이터의 세부적인 특성(style)에 집중하기 쉬워진다.

##### 2.2 Style vector
Latent code는 FC layer 8개를 거친 space에서 Affine transformation(그림 1에서 `A`)를 거쳐 style로 중간 conv block(그림 1 synthesis network 회색 부분)내 AdaIN 마다마다 주입된다. AdaIN에 style로 집어넣음으로써 latent code가 style을 학습하도록 유도한다. 


##### 2.3 Noise injection
Feature map들이 Conv layer를 지나서 AdaIN에 들어가기 전에 learnable per-pixel noise를 주입한다. 주입되는 한 곳에 하나의 noise가, conv feature map의 갯수만큼 곱해져서 feature map과 더해진다.

`feature map with noise injected = feature map + learnable weight * noise`

예를 들어, feature map의 shape이 `(batch, channel, size, size)`라면, weight의 shape은 `(1, channel, 1, 1)`이고, noise의 shape은 `(batch, 1, size, size)`이다. 결과적으로 noise가 주입된 feature map의 shape은 `(batch, channel, size, size)`으로 유지된다. 동일하게 initialize된 noise가 channel 갯수만큼의 weight와 곱해져서 주입된 feature map이 content로써 AdaIN에 입력된다. (물론 그 다음 번 step에서 주입되는 noise는 다시 initialize 된 noise이다.)

##### 2.4 Separation from global effects

Noise injection을 한다고 해서, Stochastic variation 학습이 constant input이나 style vector에서 이뤄지지 않는다는 보장이 없다. 논문에서는 그럼에도 불구하고 noise가 stochastic variation을 맡아서 학습하게 되는 이유를 설명한다. 

2.4.1) content vs. stochastic variation
저자는 StyleGAN generator 전체적으로 최대한 빠르게 content를 학습하려는 것 같다고 말한다. 이것 때문에 신경망 입장에서는 stochastic variation을 학습하는 가장 쉬운 방법이 남는 learnable weight에 의존하게 되는 것이라고 설명한다. 

2.4.2) style vs. stochastic variation
어떻게 style은 전체적인 특성(pose, identity, eyeglasses etc)에 집중하고 noise injection은 랜덤한 특성(주근깨, 모공 etc) 학습을 담당하고 서로 영향을 주지 않는가? 먼저 style vector는 AdaIN 연산을 통해 feature map 전체에 scaling, biasing 됩니다. 반면 noise injection은 feature map의 픽셀 별로 더해집니다. 따라서 style vector는 전체적인 특성을 학습하고, noise injection은 픽셀 별 랜덤한 특성을 학습하게 됩니다. 더 자세한 내용은 spatially invariant statistics를 참고하자.

##### 2.5 Mixing regularization / Style Mixing
StyleGAN에서 인접한 style vector(synthesis network에서 인접한 layer에 주입되는 style)가 서로 연관된 특성을 학습하는 현상이 있다. 예를 들어, 인접한 style vector가 서로 다르게 머리 길이와 pose를 학습하길 원하는데, 머리 길이와 pose가 서로 연관되어 학습되면 disentangled/localized style이 학습되기 어렵다. 또한 학습되는 style의 다양성이 떨어지는 문제가 발생할 수 있다.

Localized style이 학습되도록 저자는 mixing regularization을 도입한다. 만약 인접한 style vector가 서로 연관되지 않길 원한다면, 인접한 style vector를 하나만 사용하지 않고 layer 그룹마다 다른 style vector를 사용하면 된다. 예를 들어 generator에 16개의 layer가 있다면 초반 4개에는 $z_1$에서 나온 $w_1$을, 이후 12개 layer에서는 $z_2$에서 나온 $w_2$를 사용하는 방식이다. layer group을 나누는 기준은 forward할 때마다 랜덤하게 정한다. 이렇게 되면 layer마다 랜덤하게 다른 style vector를 사용해 이미지를 생성하도록 학습하기 때문에 인접한 style vector가 서로 연관되지 않도록 유도할 수 있다. 

실제 실험 결과 mixing regularization을 사용했을 때 FID 지표가 더 우수해지는 것을 확인할 수 있다.

아래 사진은 학습 이후 style mixing으로 두 latent code를 다른 layer 기준으로 섞어 fine하거나 coarse한 style을 섞어 이미지를 생성할 수 있음을 보여준다.

![](/images/2023-06-28-17-24-09.png)

>Mixing regularization과 style mixing은 동일한 연산이지만, 학습할 때 사용하면 mixing regularization이고 학습이 끝난 후 생성할 때 사용하면 style mixing이라고 한다.


## Reference
[StyeGAN 논문 링크](https://arxiv.org/pdf/1812.04948.pdf)
[StyleGAN 코드 링크](https://github.com/NVlabs/stylegan/)
[StyleGAN 코드 링크 2](https://github.com/rosinality/style-based-gan-pytorch/)