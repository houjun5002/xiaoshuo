'use client';

var React = require('react');
var useState = React.useState;
var useEffect = React.useEffect;

var creationTypes = [
  {
    value: 'plot',
    label: '情节生成',
    placeholder: '例如：生成一个玄幻小说的高潮情节，主角是剑修，对手是魔族少主',
  },
  {
    value: 'character',
    label: '人物设定',
    placeholder: '例如：创建一个冷酷无情的魔教护法，有悲惨的过去',
  },
  {
    value: 'polish',
    label: '文案润色',
    placeholder: '例如：润色这段文字：他看到了光，那是一道刺眼的光芒...',
  },
  {
    value: 'outline',
    label: '大纲创作',
    placeholder: '例如：创作一个关于时空穿越的修仙小说大纲',
  },
];

export default function WapPage() {
  var _useState = useState('plot'),
      creationType = _useState[0],
      setCreationType = _useState[1];

  var _useState2 = useState(''),
      userInput = _useState2[0],
      setUserInput = _useState2[1];

  var _useState3 = useState(''),
      result = _useState3[0],
      setResult = _useState3[1];

  var _useState4 = useState(false),
      isLoading = _useState4[0],
      setIsLoading = _useState4[1];

  var _useState5 = useState(null),
      user = _useState5[0],
      setUser = _useState5[1];

  var _useState6 = useState(0),
      todayUsage = _useState6[0],
      setTodayUsage = _useState6[1];

  var _useState7 = useState(3),
      dailyQuota = _useState7[0],
      setDailyQuota = _useState7[1];

  var _useState8 = useState(false),
      showAuthDialog = _useState8[0],
      setShowAuthDialog = _useState8[1];

  var _useState9 = useState('login'),
      authTab = _useState9[0],
      setAuthTab = _useState9[1];

  var _useState10 = useState(''),
      loginAccount = _useState10[0],
      setLoginAccount = _useState10[1];

  var _useState11 = useState(''),
      loginPassword = _useState11[0],
      setLoginPassword = _useState11[1];

  var _useState12 = useState(''),
      registerPhone = _useState12[0],
      setRegisterPhone = _useState12[1];

  var _useState13 = useState(''),
      registerPassword = _useState13[0],
      setRegisterPassword = _useState13[1];

  var _useState14 = useState(''),
      registerUsername = _useState14[0],
      setRegisterUsername = _useState14[1];

  var _useState15 = useState(false),
      isAuthLoading = _useState15[0],
      setIsAuthLoading = _useState15[1];

  var _useState16 = useState(''),
      authError = _useState16[0],
      setAuthError = _useState16[1];

  var _useState17 = useState(false),
      quotaExceeded = _useState17[0],
      setQuotaExceeded = _useState17[1];

  useEffect(function() {
    checkQuota();
    checkUser();
  }, []);

  var checkQuota = function() {
    fetch('/api/quota/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    }).then(function(res) {
      return res.json();
    }).then(function(data) {
      setTodayUsage(data.todayUsage || 0);
      setDailyQuota(data.dailyQuota || 3);
      if (user && data.canUse === false) {
        setQuotaExceeded(true);
      }
    }).catch(function(err) {
      console.error('Failed to check quota:', err);
    });
  };

  var checkUser = function() {
    fetch('/api/auth/me', {
      credentials: 'include',
    }).then(function(res) {
      return res.json();
    }).then(function(data) {
      if (data.user) {
        setUser(data.user);
        setTodayUsage(data.todayUsage || 0);
        setDailyQuota(data.dailyQuota || 10);
      }
    }).catch(function(err) {
      console.error('Failed to check user:', err);
    });
  };

  var handleTypeChange = function(e) {
    var type = e.target.value;
    setCreationType(type);
    setUserInput('');
    setResult('');
    setQuotaExceeded(false);

    var selectedType = null;
    for (var i = 0; i < creationTypes.length; i++) {
      if (creationTypes[i].value === type) {
        selectedType = creationTypes[i];
        break;
      }
    }

    var textarea = document.getElementById('user-input');
    if (textarea && selectedType) {
      textarea.placeholder = selectedType.placeholder;
    }
  };

  var handleInputChange = function(e) {
    var value = e.target.value;
    setUserInput(value);

    var count = value.length;
    var countEl = document.getElementById('char-count');
    if (countEl) {
      countEl.textContent = count + '/1000';
    }
  };

  var handleSubmit = function(e) {
    e.preventDefault();

    if (!userInput || userInput.trim() === '') {
      alert('请输入创作需求');
      return;
    }

    if (quotaExceeded) {
      setShowAuthDialog(true);
      return;
    }

    setIsLoading(true);
    setResult('');
    setQuotaExceeded(false);

    fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        type: creationType,
        input: userInput,
      }),
    }).then(function(res) {
      if (!res.ok) {
        return res.json().then(function(data) {
          throw new Error(data.error || '生成失败');
        });
      }
      return res;
    }).then(function(res) {
      if (!res.body) {
        throw new Error('生成失败');
      }

      var reader = res.body.getReader();
      var decoder = new TextDecoder();
      setResult('');

      function read() {
        reader.read().then(function(_ref) {
          var done = _ref.done,
              value = _ref.value;

          if (done) {
            setIsLoading(false);
            checkQuota();
            return;
          }

          var chunk = decoder.decode(value, { stream: true });
          setResult(function(prev) {
            return prev + chunk;
          });
          read();
        }).catch(function(error) {
          console.error('Error:', error);
          setResult('生成失败，请稍后重试');
          setIsLoading(false);
        });
      }

      read();
    }).catch(function(err) {
      console.error('Error:', err);
      var errorMsg = err.message || '生成失败，请稍后重试';
      setResult(errorMsg);
      setIsLoading(false);

      if (errorMsg === '今日配额已用尽') {
        setQuotaExceeded(true);
        setShowAuthDialog(true);
      }
    });
  };

  var handleLogin = function(e) {
    e.preventDefault();
    setIsAuthLoading(true);
    setAuthError('');

    fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        account: loginAccount,
        password: loginPassword,
      }),
    }).then(function(res) {
      return res.json();
    }).then(function(data) {
      if (data.error) {
        setAuthError(data.error);
        setIsAuthLoading(false);
      } else {
        setShowAuthDialog(false);
        setIsAuthLoading(false);
        setAuthError('');
        checkUser();
        checkQuota();
        setQuotaExceeded(false);
      }
    }).catch(function(err) {
      console.error('Login error:', err);
      setAuthError('登录失败，请稍后重试');
      setIsAuthLoading(false);
    });
  };

  var handleRegister = function(e) {
    e.preventDefault();
    setIsAuthLoading(true);
    setAuthError('');

    fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        account: registerPhone,
        password: registerPassword,
        username: registerUsername,
      }),
    }).then(function(res) {
      return res.json();
    }).then(function(data) {
      if (data.error) {
        setAuthError(data.error);
        setIsAuthLoading(false);
      } else {
        setShowAuthDialog(false);
        setIsAuthLoading(false);
        setAuthError('');
        alert('注册成功！请登录');
        setAuthTab('login');
      }
    }).catch(function(err) {
      console.error('Register error:', err);
      setAuthError('注册失败，请稍后重试');
      setIsAuthLoading(false);
    });
  };

  var handleLogout = function() {
    fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    }).then(function(res) {
      return res.json();
    }).then(function(data) {
      setUser(null);
      setTodayUsage(0);
      setDailyQuota(3);
      checkQuota();
    }).catch(function(err) {
      console.error('Logout error:', err);
    });
  };

  var currentType = null;
  for (var j = 0; j < creationTypes.length; j++) {
    if (creationTypes[j].value === creationType) {
      currentType = creationTypes[j];
      break;
    }
  }

  return React.createElement('div', { className: 'wap-container' },

    React.createElement('div', { className: 'wap-card' },
      React.createElement('div', { className: 'wap-card-header' },
        React.createElement('h1', { className: 'wap-card-title' }, 'AI 小说创作助手'),
        React.createElement('p', { className: 'wap-card-description' }, '一键生成小说情节、人物、大纲，AI 辅助创作更高效')
      ),
      user ? (
        React.createElement('div', { style: { textAlign: 'right', marginBottom: '15px' } },
          React.createElement('span', { style: { fontSize: '14px', color: '#666' } }, '用户：' + (user.email || '')),
          React.createElement('span', { style: { margin: '0 10px', color: '#ddd' } }, '|'),
          React.createElement('button', {
            className: 'wap-btn wap-btn-small',
            onClick: handleLogout,
            style: { backgroundColor: '#757575' }
          }, '退出')
        )
      ) : (
        React.createElement('div', { style: { textAlign: 'right', marginBottom: '15px' } },
          React.createElement('button', {
            className: 'wap-btn wap-btn-small',
            onClick: function() { setShowAuthDialog(true); }
          }, '登录 / 注册')
        )
      )
    ),

    React.createElement('div', { className: 'wap-card' },
      React.createElement('div', { className: 'wap-card-header' },
        React.createElement('h2', { className: 'wap-card-title' }, '使用配额')
      ),
      React.createElement('div', { className: 'wap-card-body' },
        React.createElement('div', { className: 'wap-quota' },
          React.createElement('div', { className: 'wap-quota-info' },
            React.createElement('div', { className: 'wap-quota-left' },
              React.createElement('div', { className: 'wap-quota-label' }, '今日配额使用'),
              React.createElement('div', { className: 'wap-quota-desc' }, (user ? '登录用户' : '免费用户') + '：' + todayUsage + ' / ' + dailyQuota + ' 次')
            ),
            React.createElement('div', { className: 'wap-quota-right' },
              React.createElement('div', { className: 'wap-quota-number' }, Math.max(0, dailyQuota - todayUsage)),
              React.createElement('div', { className: 'wap-quota-text' }, '剩余次数')
            )
          )
        )
      )
    ),

    React.createElement('div', { className: 'wap-card' },
      React.createElement('div', { className: 'wap-card-header' },
        React.createElement('h2', { className: 'wap-card-title' }, '创作配置'),
        React.createElement('p', { className: 'wap-card-description' }, '选择创作类型并输入您的需求，AI 将为您生成内容')
      ),
      React.createElement('div', { className: 'wap-card-body' },
        React.createElement('div', { className: 'wap-form-group' },
          React.createElement('label', { className: 'wap-label', htmlFor: 'creation-type' }, '创作类型'),
          React.createElement('select', {
            id: 'creation-type',
            className: 'wap-select',
            value: creationType,
            onChange: handleTypeChange
          },
            creationTypes.map(function(type) {
              return React.createElement('option', {
                key: type.value,
                value: type.value
              }, type.label);
            })
          )
        ),
        React.createElement('div', { className: 'wap-form-group' },
          React.createElement('label', { className: 'wap-label', htmlFor: 'user-input' }, '创作需求'),
          React.createElement('textarea', {
            id: 'user-input',
            className: 'wap-textarea',
            placeholder: currentType ? currentType.placeholder : '请先选择创作类型',
            value: userInput,
            onChange: handleInputChange,
            maxLength: 1000
          }),
          React.createElement('p', { style: { textAlign: 'right', fontSize: '12px', color: '#666', marginTop: '4px' } },
            React.createElement('span', { id: 'char-count' }, userInput.length + '/1000')
          )
        ),
        React.createElement('div', { className: 'wap-form-group' },
          React.createElement('button', {
            className: 'wap-btn wap-btn-full',
            onClick: handleSubmit,
            disabled: isLoading || !userInput || userInput.trim() === ''
          }, isLoading ? '生成中...' : '开始创作')
        )
      )
    ),

    result && !isLoading ? (
      React.createElement('div', { className: 'wap-card' },
        React.createElement('div', { className: 'wap-card-header' },
          React.createElement('h2', { className: 'wap-card-title' }, '生成结果')
        ),
        React.createElement('div', { className: 'wap-card-body' },
          React.createElement('div', { className: 'wap-result' }, result)
        )
      )
    ) : null,

    isLoading ? (
      React.createElement('div', { className: 'wap-card' },
        React.createElement('div', { className: 'wap-card-body' },
          React.createElement('div', { className: 'wap-loading' },
            React.createElement('div', { className: 'wap-spinner' }),
            React.createElement('p', { style: { marginTop: '15px', color: '#666' } }, '正在生成中，请稍候...')
          )
        )
      )
    ) : null,

    quotaExceeded && !user ? (
      React.createElement('div', { className: 'wap-card' },
        React.createElement('div', { className: 'wap-card-body' },
          React.createElement('div', { className: 'wap-alert wap-alert-warning' },
            '今日免费配额已用完（3次），登录后可使用 10 次。'
          )
        )
      )
    ) : null,

    React.createElement('div', { style: { textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#999' } },
      '基于扣子豆包大模型 | 专为小说创作打造'
    ),

    showAuthDialog ? React.createElement('div', {
      className: 'wap-modal-overlay show',
      onClick: function() { setShowAuthDialog(false); }
    },
      React.createElement('div', { className: 'wap-modal show', onClick: function(e) { return e.stopPropagation(); } },
        React.createElement('button', {
          className: 'wap-modal-close',
          onClick: function() { setShowAuthDialog(false); }
        }, '×'),
        React.createElement('div', { className: 'wap-modal-header' },
          React.createElement('h3', { className: 'wap-modal-title' }, authTab === 'login' ? '登录' : '注册'),
          React.createElement('p', { style: { fontSize: '13px', color: '#666', marginTop: '4px' } },
            authTab === 'login' ? '登录以享受更多使用次数' : '注册新账户'
          )
        ),
        React.createElement('div', { className: 'wap-tabs' },
          React.createElement('div', { className: 'wap-tab-list' },
            React.createElement('button', {
              className: 'wap-tab-item' + (authTab === 'login' ? ' active' : ''),
              onClick: function() {
                setAuthTab('login');
                setAuthError('');
              }
            }, '登录'),
            React.createElement('button', {
              className: 'wap-tab-item' + (authTab === 'register' ? ' active' : ''),
              onClick: function() {
                setAuthTab('register');
                setAuthError('');
              }
            }, '注册')
          )
        ),
        authError ? React.createElement('div', { className: 'wap-alert wap-alert-error' }, authError) : null,
        authTab === 'login' ? React.createElement('form', { onSubmit: handleLogin },
          React.createElement('div', { className: 'wap-form-group' },
            React.createElement('label', { className: 'wap-label', htmlFor: 'login-account' }, '手机号/邮箱'),
            React.createElement('input', {
              id: 'login-account',
              type: 'text',
              className: 'wap-input',
              placeholder: '请输入手机号或邮箱',
              value: loginAccount,
              onChange: function(e) { setLoginAccount(e.target.value); },
              required: true
            })
          ),
          React.createElement('div', { className: 'wap-form-group' },
            React.createElement('label', { className: 'wap-label', htmlFor: 'login-password' }, '密码'),
            React.createElement('input', {
              id: 'login-password',
              type: 'password',
              className: 'wap-input',
              placeholder: '请输入密码',
              value: loginPassword,
              onChange: function(e) { setLoginPassword(e.target.value); },
              required: true
            })
          ),
          React.createElement('div', { className: 'wap-form-group' },
            React.createElement('button', {
              type: 'submit',
              className: 'wap-btn wap-btn-full',
              disabled: isAuthLoading
            }, isAuthLoading ? '登录中...' : '登录')
          )
        ) : React.createElement('form', { onSubmit: handleRegister },
          React.createElement('div', { className: 'wap-form-group' },
            React.createElement('label', { className: 'wap-label', htmlFor: 'register-phone' }, '手机号'),
            React.createElement('input', {
              id: 'register-phone',
              type: 'tel',
              className: 'wap-input',
              placeholder: '请输入手机号',
              value: registerPhone,
              onChange: function(e) { setRegisterPhone(e.target.value); },
              required: true,
              pattern: '^1[3-9]\\d{9}$',
              title: '请输入正确的手机号'
            })
          ),
          React.createElement('div', { className: 'wap-form-group' },
            React.createElement('label', { className: 'wap-label', htmlFor: 'register-username' }, '用户名'),
            React.createElement('input', {
              id: 'register-username',
              type: 'text',
              className: 'wap-input',
              placeholder: '请输入用户名',
              value: registerUsername,
              onChange: function(e) { setRegisterUsername(e.target.value); },
              required: true
            })
          ),
          React.createElement('div', { className: 'wap-form-group' },
            React.createElement('label', { className: 'wap-label', htmlFor: 'register-password' }, '密码'),
            React.createElement('input', {
              id: 'register-password',
              type: 'password',
              className: 'wap-input',
              placeholder: '请输入密码（至少6位）',
              value: registerPassword,
              onChange: function(e) { setRegisterPassword(e.target.value); },
              required: true,
              minLength: 6
            })
          ),
          React.createElement('div', { className: 'wap-form-group' },
            React.createElement('button', {
              type: 'submit',
              className: 'wap-btn wap-btn-full',
              disabled: isAuthLoading
            }, isAuthLoading ? '注册中...' : '注册')
          ),
          React.createElement('p', { style: { fontSize: '12px', textAlign: 'center', color: '#666', marginTop: '12px' } },
            '注册后每日可使用 10 次（免费用户 3 次）'
          )
        )
      )
    ) : null
  );
}
