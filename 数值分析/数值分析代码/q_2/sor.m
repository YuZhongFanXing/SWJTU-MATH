function [x, iter] = sor(A, x0, omega, tol)
    n = length(x0);%根据初始解的向量判断矩阵的阶数，便于在主函数中利用生成矩阵的函数来生成对应阶数的函数
    x = x0;%初始解，题目中为全为1的向量
    iter = 0;%迭代次数，初始为0
    
    while true
        iter = iter + 1;
        x_new = x; 
        
        % SOR迭代公式实现
        for i = 1:n
            sum1 = 0; % i之前的项
            for j = 1:i-1
                sum1 = sum1 + A(i,j) * x_new(j);
            end
            
            sum2 = 0; % i之后的项
            for j = i+1:n
                sum2 = sum2 + A(i,j) * x(j);
            end
            
            % 公式: x_i^(k+1) = (1-omega)*x_i^k + omega*(1/a_ii)*(-sum1-sum2)
            x_new(i) = (1-omega)*x(i) + omega*(-sum1-sum2)/A(i,i);
        end
        
        % 检查收敛条件 ||x^(k)||_inf <= tol
        if norm(x_new, inf) <= tol
            break;
        end
        
        x = x_new;
    end
end