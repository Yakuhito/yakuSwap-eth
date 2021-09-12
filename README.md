# yakuSwap-eth

Gas consumption (estimate):

```
·------------------------------|---------------------------|-------------|-----------------------------·
|     Solc version: 0.8.7      ·  Optimizer enabled: true  ·  Runs: 200  ·  Block limit: 30000000 gas  │
·······························|···························|·············|······························
|  Methods                     ·              100 gwei/gas               ·       3417.01 usd/eth       │
··············|················|·············|·············|·············|···············|··············
|  Contract   ·  Method        ·  Min        ·  Max        ·  Avg        ·  # calls      ·  usd (avg)  │
··············|················|·············|·············|·············|···············|··············
|  TestToken  ·  approve       ·      46239  ·      46251  ·      46250  ·           12  ·      15.80  │
··············|················|·············|·············|·············|···············|··············
|  YakuSwap   ·  cancelSwap    ·          -  ·          -  ·      40105  ·            2  ·      13.70  │
··············|················|·············|·············|·············|···············|··············
|  YakuSwap   ·  completeSwap  ·      86298  ·      86310  ·      86306  ·            6  ·      29.49  │
··············|················|·············|·············|·············|···············|··············
|  YakuSwap   ·  createSwap    ·      84508  ·      84520  ·      84519  ·           24  ·      28.88  │
··············|················|·············|·············|·············|···············|··············
|  YakuSwap   ·  withdrawFees  ·      36483  ·      52383  ·      47083  ·            3  ·      16.09  │
··············|················|·············|·············|·············|···············|··············
|  Deployments                 ·                                         ·  % of limit   ·             │
·······························|·············|·············|·············|···············|··············
|  TestToken                   ·          -  ·          -  ·     641308  ·        2.1 %  ·     219.14  │
·······························|·············|·············|·············|···············|··············
|  YakuSwap                    ·          -  ·          -  ·     902396  ·          3 %  ·     308.35  │
·------------------------------|-------------|-------------|-------------|---------------|-------------·
```

License
=======
    Copyright 2021 Mihai Dancaescu

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
