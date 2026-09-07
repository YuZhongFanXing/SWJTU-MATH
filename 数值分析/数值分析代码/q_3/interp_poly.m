function [coeff, y_interp, error] = interp_poly(x, y, xi)

    n = length(x); % 数据点个数
    
    % 步骤1: 使用拉格朗日插值公式构造多项式
    y_interp = zeros(size(xi));
    
    for k = 1:length(xi)
        L = ones(1, n); % 拉格朗日基函数
        for i = 1:n
            for j = 1:n
                if j ~= i
                    L(i) = L(i) * (xi(k) - x(j)) / (x(i) - x(j));
                end
            end
        end
        y_interp(k) = sum(y .* L);
    end
    
    % 步骤2: 使用拉格朗日插值得到多项式系数
    coeff = zeros(1, n); % n-1次多项式有n个系数
    
    % 对于每个拉格朗日基函数L_i(x)，将其乘以y_i并加到总多项式中
    for i = 1:n
        % 计算拉格朗日基函数L_i(x)的系数
        Li_coeff = [1]; % 初始化为1
        
        % 构造 ∏_{j≠i} (x - x_j) 的系数
        for j = 1:n
            if j ~= i
                Li_coeff = conv(Li_coeff, [1, -x(j)]);
            end
        end
        
        % 除以 ∏_{j≠i} (x_i - x_j)
        denominator = 1;
        for j = 1:n
            if j ~= i
                denominator = denominator * (x(i) - x(j));
            end
        end
        
        Li_coeff = Li_coeff / denominator;
        
        % 将y_i * L_i(x)加到总多项式中
        coeff = coeff + y(i) * Li_coeff;
    end
    
    % 现在coeff包含了从最高次到最低次的系数
    
    % 验证：使用得到的系数计算原始点的值
    y_original = polyval(coeff, x);
    
    % 计算在原始点上的误差（理论上应该为0或非常接近0）
    error = norm(y - y_original, 2); % L2范数误差
    
end
