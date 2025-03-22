import { useState, useEffect } from 'react'
import { Table, Form, Input, Button, InputNumber, Card, Statistic, Row, Col, message, Modal, Space } from 'antd'
import { PlusOutlined, ShoppingOutlined, DeleteOutlined, HistoryOutlined } from '@ant-design/icons'
import './App.css'

function App() {
  const [buyStrategyPercent, setBuyStrategyPercent] = useState(5);
  const [sellStrategyPercent, setSellStrategyPercent] = useState(5);
  const [groupsNumber, setGroupsNumber] = useState(3);
  const [strategyResults, setStrategyResults] = useState([]);
  const [form] = Form.useForm();
  const [sellForm] = Form.useForm();
  const [initialCapital, setInitialCapital] = useState(() => {
    const savedCapital = localStorage.getItem('initialCapital');
    return savedCapital ? parseFloat(savedCapital) : 20000;
  });
  const [stocks, setStocks] = useState(() => {
    const savedStocks = localStorage.getItem('stocks');
    return savedStocks ? JSON.parse(savedStocks) : [];
  });
  const [operationLogs, setOperationLogs] = useState(() => {
    const savedLogs = localStorage.getItem('operationLogs');
    return savedLogs ? JSON.parse(savedLogs) : [];
  });
  const [totalProfit, setTotalProfit] = useState(() => {
    const savedProfit = localStorage.getItem('totalProfit');
    return savedProfit ? parseFloat(savedProfit) : 0;
  });
  const [sellModalVisible, setSellModalVisible] = useState(false);
  const [addPurchaseModalVisible, setAddPurchaseModalVisible] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);
  const [addPurchaseForm] = Form.useForm();

  // 策略计算函数
  const calculateStrategy = () => {
    const results = stocks.flatMap(stock => {
      return Array.from({ length: groupsNumber }, (_, i) => ({
        key: `${stock.key}-${i + 1}`,
        name: stock.name,
        symbol: stock.symbol,
        group: i + 1,
        buyPrice: stock.costPrice * Math.pow(1 - buyStrategyPercent/100, i + 1),
        sellPrice: stock.costPrice * Math.pow(1 + sellStrategyPercent/100, i + 1),
        costPrice: stock.costPrice
      }));
    });
    setStrategyResults(results);
  };
  
  // 计算已用资金和剩余资金
  const usedCapital = stocks.reduce((sum, stock) => sum + (stock.quantity * stock.costPrice), 0);
  const remainingCapital = initialCapital - usedCapital;
  
  // 计算总资产（本金 + 盈利）
  const totalAssets = initialCapital + totalProfit;

  // 保存股票数据到本地存储
  useEffect(() => {
    localStorage.setItem('stocks', JSON.stringify(stocks));
  }, [stocks]);

  // 保存操作记录到本地存储
  useEffect(() => {
    localStorage.setItem('operationLogs', JSON.stringify(operationLogs));
  }, [operationLogs]);

  // 保存总盈利到本地存储
  useEffect(() => {
    localStorage.setItem('totalProfit', totalProfit.toString());
  }, [totalProfit]);

  // 添加操作记录
  const addOperationLog = (type, content, profit = null) => {
    const newLog = {
      key: Date.now().toString(),
      type,
      content,
      timestamp: new Date().toLocaleString(),
      profit
    };
    setOperationLogs([newLog, ...operationLogs]);
  };

  // 更新总资产
  const handleCapitalChange = (value) => {
    const oldValue = initialCapital;
    setInitialCapital(value);
    localStorage.setItem('initialCapital', value.toString());
    addOperationLog('资产变更', `总资产从 $${oldValue.toFixed(2)} 调整为 $${value.toFixed(2)}`);
  };

  // 添加新股票
  const onFinish = (values) => {
    const stockCost = values.quantity * values.costPrice;
    if (stockCost > remainingCapital) {
      message.error('剩余资金不足，无法新增该股票');
      return;
    }

    const newStock = {
      key: Date.now().toString(),
      symbol: values.symbol,
      name: values.name || values.symbol,
      quantity: Number(values.quantity),
      costPrice: Number(values.costPrice),
      totalCost: stockCost
    };
    
    setStocks([...stocks, newStock]);
    form.resetFields();
    message.success('股票添加成功');
    addOperationLog('新增股票', `新增 ${newStock.name}(${newStock.symbol}) ${newStock.quantity}股，单价 $${newStock.costPrice.toFixed(2)}，总成本 $${stockCost.toFixed(2)}`);
  };

  // 打开卖出对话框
  const handleSellClick = (stock) => {
    setSelectedStock(stock);
    setSellModalVisible(true);
    sellForm.setFieldsValue({
      quantity: stock.quantity,
      sellPrice: stock.costPrice
    });
  };

  // 处理卖出股票
  const handleSell = () => {
    sellForm.validateFields().then(values => {
      const { quantity: sellQuantity, sellPrice } = values;
      const stock = selectedStock;
      
      if (sellQuantity > stock.quantity) {
        message.error('卖出数量不能超过持有数量');
        return;
      }

      // 计算本次卖出的盈利
      const sellValue = sellQuantity * sellPrice;
      const costValue = sellQuantity * stock.costPrice;
      const profit = sellValue - costValue;

      // 更新总盈利
      setTotalProfit(prevProfit => prevProfit + profit);

      if (sellQuantity === stock.quantity) {
        // 全部卖出
        setStocks(stocks.filter(s => s.key !== stock.key));
      } else {
        // 部分卖出
        setStocks(stocks.map(s => {
          if (s.key === stock.key) {
            return {
              ...s,
              quantity: s.quantity - sellQuantity
            };
          }
          return s;
        }));
      }

      setSellModalVisible(false);
      sellForm.resetFields();
      message.success('股票卖出成功');
      addOperationLog(
        '卖出股票', 
        `卖出 ${stock.name}(${stock.symbol}) ${sellQuantity}股，单价 $${sellPrice.toFixed(2)}，总收入 $${sellValue.toFixed(2)}`,
        profit
      );
    });
  };

  // 处理追加买入点击
  const handleAddPurchaseClick = (stock) => {
    setSelectedStock(stock);
    setAddPurchaseModalVisible(true);
    addPurchaseForm.setFieldsValue({
      quantity: 100,
      costPrice: stock.costPrice
    });
  };

  // 处理追加买入操作
  const handleAddPurchase = () => {
    addPurchaseForm.validateFields().then(values => {
      const { quantity, costPrice } = values;
      const newInvestment = quantity * costPrice;

      if (newInvestment > remainingCapital) {
        message.error('剩余资金不足，无法追加买入');
        return;
      }

      setStocks(stocks.map(stock => {
        if (stock.key === selectedStock.key) {
          const totalQuantity = stock.quantity + quantity;
          const averageCost = 
            ((stock.quantity * stock.costPrice) + newInvestment) / totalQuantity;

          return {
            ...stock,
            quantity: totalQuantity,
            costPrice: averageCost
          };
        }
        return stock;
      }));

      setAddPurchaseModalVisible(false);
      addPurchaseForm.resetFields();
      message.success('追加买入成功');
      addOperationLog(
        '追加买入', 
        `${selectedStock.name}(${selectedStock.symbol}) 追加${quantity}股，单价 $${costPrice.toFixed(2)}，总投入 $${newInvestment.toFixed(2)}`
      );
    });
  };

  // 操作记录列定义
  const logColumns = [
    {
      title: '操作类型',
      dataIndex: 'type',
      key: 'type',
    },
    {
      title: '操作内容',
      dataIndex: 'content',
      key: 'content',
    },
    {
      title: '操作时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
    },
    {
      title: '盈亏',
      dataIndex: 'profit',
      key: 'profit',
      render: (value) => value ? (
        <span style={{ color: value >= 0 ? '#3f8600' : '#cf1322' }}>
          ${value.toFixed(2)}
        </span>
      ) : '-'
    }
  ];

  // 表格列定义
  const columns = [
    {
      title: '股票代码',
      dataIndex: 'symbol',
      key: 'symbol',
    },
    {
      title: '股票名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '持有数量',
      dataIndex: 'quantity',
      key: 'quantity',
    },
    {
      title: '成本价',
      dataIndex: 'costPrice',
      key: 'costPrice',
      render: (value) => value.toFixed(2),
    },
    {
      title: '总成本',
      key: 'totalCost',
      render: (_, record) => (record.quantity * record.costPrice).toFixed(2),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            icon={<ShoppingOutlined />}
            onClick={() => handleSellClick(record)}
          >
            卖出
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => handleAddPurchaseClick(record)}
          >
            追加
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="container">
      <h1>股票资产管理</h1>
      
      {/* 总资产概览 */}
      <Card title="资产概览" className="summary-card" 

      >
        <Row gutter={16}>
          <Col span={6}>
            <Statistic 
              title="本金 ($)" 
              value={initialCapital}
              precision={2} 
              
              formatter={(value) => (
                <InputNumber
                  style={{ width: 150 }}
                  value={value}
                  onChange={handleCapitalChange}
                  min={0}
                  step={1000}
                  precision={2}
                  
                />
              )}
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="总盈利 ($)" 
              value={totalProfit}
              prefix="$" 
              precision={2} 
               
              valueStyle={{ color: totalProfit >= 0 ? '#3f8600' : '#cf1322' }}
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="累计资产 ($)" 
              value={totalAssets}
              prefix="$" 
              precision={2} 
               
            />
          </Col>
          <Col span={6}>
            <Statistic 
              title="剩余资金 ($)" 
              value={remainingCapital}
              prefix="$" 
              precision={2} 
               
              valueStyle={{ color: remainingCapital >= 0 ? 'black' : 'red' }}
            />
          </Col>
        </Row>
      </Card>


      
      {/* 添加股票表单 */}
      <Card title="新增股票" className="form-card">
        <Form
          form={form}
          name="add_stock"
          layout="inline"
          onFinish={onFinish}
        >
          <Form.Item
            name="symbol"
            rules={[{ required: true, message: '请输入股票代码' }]}
          >
            <Input placeholder="股票代码" />
          </Form.Item>
          
          <Form.Item name="name">
            <Input placeholder="股票名称 (可选)" />
          </Form.Item>
          
          <Form.Item
            name="quantity"
            rules={[{ required: true, message: '请输入持有数量' }]}
          >
            <InputNumber 
              min={1} 
              placeholder="持有数量" 
              style={{ width: 120 }} 
            />
          </Form.Item>
          
          <Form.Item
            name="costPrice"
            rules={[{ required: true, message: '请输入成本价' }]}
          >
            <InputNumber 
              min={0.01} 
              step={0.01} 
              placeholder="成本价" 
              style={{ width: 120 }} 
            />
          </Form.Item>
          
          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              icon={<PlusOutlined />}
            >
              新增
            </Button>
          </Form.Item>
        </Form>
      </Card>


      
      {/* 股票列表 */}
      <Card 
        title="股票列表" 
        className="table-card"
      >
        <Table 
          dataSource={stocks} 
          columns={columns} 
          pagination={false} 
          locale={{ emptyText: '暂无股票，请添加股票' }}
        />
      </Card>



      {/* 量化策略模块 */}
      <Card className="strategy-card" title="量化策略">
        <Form layout="inline">
          <Form.Item label="买入策略 (%) ">
            <InputNumber
              min={1}
              max={50}
              value={buyStrategyPercent}
              onChange={setBuyStrategyPercent}
            />
          </Form.Item>
          <Form.Item label="卖出策略 (%) ">
            <InputNumber
              min={1}
              max={50}
              value={sellStrategyPercent}
              onChange={setSellStrategyPercent}
            />
          </Form.Item>
          <Form.Item label="计算组数">
            <InputNumber
              min={1}
              max={10}
              value={groupsNumber}
              onChange={setGroupsNumber}
            />
          </Form.Item>
          <Button type="primary" onClick={calculateStrategy}>计算</Button>
        </Form>
      </Card>

      {/* 策略结果表格 */}
      <Table
        dataSource={strategyResults}
        columns={[
          { title: '股票名称', dataIndex: 'name' },
          {
            title: '成本基准',
            dataIndex: 'costPrice',
            render: value => `$${value.toFixed(2)}`
          },
          { title: '组别', dataIndex: 'group' },
          { 
            title: '买入价格', 
            dataIndex: 'buyPrice',
            render: value => `$${value.toFixed(2)}`
          },
          {
            title: '卖出价格',
            dataIndex: 'sellPrice',
            render: value => `$${value.toFixed(2)}`
          }
        ]}
        pagination={false}
      />

      {/* 操作记录列表 */}
      <Card 
        title="操作记录" 
        className="table-card"
        extra={
          <span>
            <HistoryOutlined /> 最近操作
          </span>
        }
      >
        <Table 
          dataSource={operationLogs} 
          columns={logColumns} 
          pagination={{ pageSize: 5 }}
          locale={{ emptyText: '暂无操作记录' }}
        />
      </Card>



      {/* 卖出股票对话框 */}
      <Modal
        title="卖出股票"
        open={sellModalVisible}
        onOk={handleSell}
        onCancel={() => {
          setSellModalVisible(false);
          sellForm.resetFields();
        }}
      >
        <Form
          form={sellForm}
          layout="vertical"
        >
          <Form.Item
            label="卖出数量"
            name="quantity"
            rules={[{ required: true, message: '请输入卖出数量' }]}
          >
            <InputNumber
              min={1}
              style={{ width: '100%' }}
              placeholder="请输入卖出数量"
            />
          </Form.Item>
          <Form.Item
            label="卖出价格"
            name="sellPrice"
            rules={[{ required: true, message: '请输入卖出价格' }]}
          >
            <InputNumber
              min={0.01}
              step={0.01}
              style={{ width: '100%' }}
              placeholder="请输入卖出价格"
            />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="追加买入"
        open={addPurchaseModalVisible}
        onCancel={() => setAddPurchaseModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setAddPurchaseModalVisible(false)}>
            取消
          </Button>,
          <Button key="submit" type="primary" onClick={handleAddPurchase}>
            确认追加
          </Button>,
        ]}
      >
        <Form form={addPurchaseForm} layout="vertical">
          <Form.Item
            label="追加数量"
            name="quantity"
            rules={[{ required: true, message: '请输入追加数量' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            label="买入价格"
            name="costPrice"
            rules={[{ required: true, message: '请输入买入价格' }]}
          >
            <InputNumber
              min={0.01}
              precision={2}
              step={0.1}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form>
      </Modal>
      



      
    </div>
  )
}

export default App
