(function(win, $, Backbone) {
	var $container = $('#container'),
		router = {},
		cartItems = {},
		templates = {},
		loadTemplates = function(templatesArr, cb) {
			var index = 0,
				count = templatesArr.length,
				commonCode = function() {
					--count
					++index
					if(count !== 0) {
						loadTemplate(templatesArr[index])
					} else {
						if(typeof cb === 'function') {
							cb()
						}
					}
				},
				loadTemplate = function(name) {
					$.get('static/templates/' + name + '.html', {v: new Date().getTime()})
					.done(function(response) {
						// console.log('successfully fetched "' + name + '" template from server!')
						templates[name] = response
						commonCode()
					})
					.fail(function() {
						// console.log('error while fetching "' + name + '" template from server!')
					})
			}
			loadTemplate(templatesArr[index])
		},
		getTemplate = function(name, callback) {
			if(_.has(templates, name)) {
				return templates[name]
			} else {
				$.get('/static/templates/' + name + '.html', {v: new Date().getTime()})
				.done(function(response) {
					templates[name] = response
					console.log('template fetched from server')
					if(typeof callback === 'function') {
						callback()
					}
				})
				.fail(function() {
					console.log('error while fetching ' + name + ' template from server!')
				})
				return '<div>Loading...</div>';
			}
		},
		fetchUtil = function(paramsObj) {
			var params = paramsObj || {}
			return {
				data: params,
				success: function() {},
				error: function() {},
				reset: true
			}
		},
		destroyFn = function() {
			return function() {
				this.undelegateEvents()
				this.$el.removeData().unbind()
				this.remove()
				Backbone.View.prototype.remove.call(this)
			}
		},
		/* collections */
		AmountsCollection = Backbone.Collection.extend({
			url: 'static/json/amounts.json'
		}),
		BrandsCollection = Backbone.Collection.extend({
			url: 'static/json/brands.json'
		}),
		SortByCollection = Backbone.Collection.extend({
			url: 'static/json/sortBy.json'
		}),
		ProductsCollection = Backbone.Collection.extend({
			url: 'static/json/products.json',
			parse: function(response, options) {
				var returnData = _.clone(response);
				if(_.size(options.data) > 0) {
					var optData = options.data
					if(_.size(optData.price) > 0) {
						// console.log('price filter needs to be applied!', returnData)
						var minPrice = 0, maxPrice = 0, priceArr = optData.price.split('-')
						if(_.size(priceArr) > 0) {
							minPrice = parseInt(priceArr[0]);
						}
						if(_.size(priceArr) > 1) {
							maxPrice = priceArr[1] !== 'ALL' ? parseInt(priceArr[1]) : 0
						}
						returnData = returnData.filter(function(data) {
							return maxPrice !== 0 ? data.current_price > minPrice && data.current_price < maxPrice : data.current_price > minPrice
						})
						// console.log('after filtering products based on price', returnData)
					}
					if(_.size(optData.brand) > 0) {
						// console.log('brand filter needs to be applied!', returnData)
						returnData = returnData.filter(function(data) {
							var dBrand = _.size(data.brand) > 0 ? data.brand.toLowerCase() : ''
							var oBrand = _.size(optData.brand) > 0 ? optData.brand.toLowerCase() : ''
							return dBrand === oBrand
						})
						// console.log('after filtering products based on brand', returnData)
					}
					if(_.size(optData.sortBy) > 0) {
						returnData = returnData.sort(function(one, two) {
							if(optData.sortBy === 'PRICE-ASC') {
								return one.current_price - two.current_price
							}
							if(optData.sortBy === 'PRICE-DESC') {
								return two.current_price - one.current_price
							}
							if(optData.sortBy === 'DISCOUNT-ASC') {
								return one.discount - two.discount
							}
							if(optData.sortBy === 'DISCOUNT-DESC') {
								return two.discount - one.discount
							}
							if(optData.sortBy === 'NEW') {
								return one.isNew === two.isNew ? 0 : one.isNew ? -1 : 1
							}
							return one.isPopular === two.isPopular ? 0 : one.isPopular ? -1 : 1
						})
					}
				}
				// console.log(returnData)
				return returnData
			}
		}),
		/* views */
		FilterView = Backbone.View.extend({
			initialize: function(options) {
				this.options = options
				this.selectedValue = options.selectedValue
				this.collection.on('reset', this.render, this)
			},
			render: function() {
				var options = this.collection.toJSON();
				var template = _.template(getTemplate('dropdown', this.render))
				this.$el.html(template({options: options, selectedValue: this.selectedValue}))
				return this
			},
			destroy: destroyFn.call(this)
		}),
		ProductsView = Backbone.View.extend({
			initialize: function(options) {
				this.options = options
				this.params = options.params
				this.collection.on('reset', this.render, this)
				this.isViewRendered = false
			},
			events: {
				'click #resetFilters': 'clearFilters',
				'change #price': 'filterByPrice',
				'change #brand': 'filterByBrand',
				'change #sortBy': 'sortProducts',
				'click .add-to-cart': 'addToCartItems'
			},
			render: function() {
				if( ! this.isViewRendered) {
					var template = _.template(getTemplate('products', this.render))
					this.$el.html(template({}))
					this.isViewRendered = true
					var amountsCollection = new AmountsCollection()
					var priceView = new FilterView({
						el: this.$('#price'),
						collection: amountsCollection,
						selectedValue: this.params.price
					})
					amountsCollection.fetch(fetchUtil())
					var brandsCollection = new BrandsCollection()
					var brandView = new FilterView({
						el: this.$('#brand'),
						collection: brandsCollection,
						selectedValue: this.params.brand
					})
					brandsCollection.fetch(fetchUtil())
					var sortByCollection = new SortByCollection()
					var brandView = new FilterView({
						el: this.$('#sortBy'),
						collection: sortByCollection,
						selectedValue: this.params.sortBy
					})
					sortByCollection.fetch(fetchUtil())
				}
				this.$('#resetFiltersWrapper').toggle(_.size(this.params.price) > 0 || _.size(this.params.brand) > 0)
				if(this.collection.length > 0) {
					this.$('.products').html('')
					this.collection.each(function(model) {
						var productView = new ProductView({
							el: this.$('.products'),
							model: model
						})
						productView.render()
					}, this)
				} else {
					this.$('.products').html('<div class="col text-center">Products Not available!</div>')
				}
				return this
			},
			filterByPrice: function(e) {
				e.preventDefault()
				var price = $(e.currentTarget).val()
				// console.log('price: ', price)
				var params = _.extend(this.params, {price: price})
				this.collection.fetch(fetchUtil(params))
			},
			filterByBrand: function(e) {
				e.preventDefault()
				var brand = $(e.currentTarget).val()
				// console.log('brand: ', brand)
				var params = _.extend(this.params, {brand: brand})
				this.collection.fetch(fetchUtil(params))
			},
			sortProducts: function(e) {
				e.preventDefault()
				var sortBy = $(e.currentTarget).val()
				console.log('sortBy: ', sortBy)
				var params = _.extend(this.params, {sortBy: sortBy})
				this.collection.fetch(fetchUtil(params))
			},
			clearFilters: function(e) {
				e.preventDefault()
				this.$('#price, #brand').val('')
				this.$('#sortBy').val('POPULAR')
				var params = _.extend(this.params, {price: '', brand: '', sortBy: 'POPULAR'});
				this.collection.fetch(fetchUtil(params))
			},
			addToCartItems: function(e) {
				e.preventDefault()
				var id = $(e.currentTarget).attr('data-id')
				var productData = this.collection.get(id).toJSON()
				var existingProducts = cartItems[productData.id]
				if(_.size(existingProducts) > 0) {
					_.extend(productData, { quantity: existingProducts.quantity + 1 })
				} else {
					_.extend(productData, { quantity: 1 })
				}
				cartItems[productData.id] = productData
				console.log(cartItems)
				updateCartCount()
			},
			destroy: destroyFn.call(this)
		}),
		ProductView = Backbone.View.extend({
			initialize: function(options) {
				this.options = options
				this.model.on('change', this.render, this)
			},
			render: function() {
				var template = _.template(getTemplate('product', this.render))
				var data = this.model.toJSON()
				this.$el.append(template({data: data}))
				return this
			},
			destroy: destroyFn.call(this)
		}),
		CartView = Backbone.View.extend({
			initialize: function(options) {
				this.options = options
			},
			events: {
				'click .remove-product': 'removeProduct',
				'click #checkout': 'checkoutCart'
			},
			render: function() {
				var template = _.template(getTemplate('cart', this.render))
				this.$el.html(template({data: cartItems}))
				return this
			},
			checkoutCart: function(e) {
				e.preventDefault()
				var emailRegExp = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
				var phoneRegExp = /^[1-9]([\d\ \ ]{6,12})$/
				var errMsgElem = this.$('#cart-error')
				errMsgElem.hide().text('')
				var name = $.trim(this.$('#user-name').val())
				var email = $.trim(this.$('#user-email').val())
				var phone = $.trim(this.$('#user-phone').val())
				var address = $.trim(this.$('#user-address').val())
				var errMsg = ''
				if( ! _.size(name) > 0) {
					errMsg = 'Full name is required'
				} else if( ! (_.size(email) > 0 && emailRegExp.test(email))) {
					errMsg = 'Please enter valid email'
				} else if( ! (_.size(phone) > 0 && phoneRegExp.test(phone))) {
					errMsg = 'Please enter valid phone number'
				} else if( ! (_.size(address) > 0 && _.size(address) < 250)) {
					errMsg = 'Please enter valid address'
				}
				if(_.size(errMsg) > 0) {
					errMsgElem.text(errMsg).show()
				} else {
					this.checkoutSuccess()
				}
			},
			checkoutSuccess: function() {
				this.$el.html('<h1>Thank you for shopping with us!</h1>')
				cartItems = {}
				updateCartCount()
				setTimeout(function() {
					router.navigate('', {trigger: true, replace: true})
				}, 3000)
			},
			removeProduct: function(e) {
				e.preventDefault()
				var id = this.$(e.currentTarget).attr('data-id')
				if(id && _.has(cartItems, id)) {
					var qty = cartItems[id].quantity
					if(qty > 1) {
						cartItems[id].quantity = qty - 1
					} else {
						delete cartItems[id]
					}
				}
				updateCartCount()
				createCart()
			},
			destroy: destroyFn.call(this)
		}),
		updateCartCount = function() {
			/* update cart count */
			var totalCartItems = 0
			_.each(cartItems, function(item) {
				totalCartItems += item.quantity
			}, this)
			$('#cart-count').html('(' + totalCartItems + ')')
		},
		createCart = function() {
			var cartView = new CartView({
				el: $('#cart')
			})
			cartView.render()
		},
		AppRouter = Backbone.Router.extend({
			routes: {
				'': 'home',
				'home': 'home',
				'cart': 'cart'
			},
			home: function() {
				$container.html('<div id="products">Loading...</div>')
				loadTemplates(['dropdown', 'products', 'product'], _.bind(function() {
					var productsCollection = new ProductsCollection()
					var params = {
						price: '',
						brand: '',
						sortBy: 'POPULAR'
					}
					var productsView = new ProductsView({
						el: $('#products'),
						collection: productsCollection,
						params: params
					})
					productsCollection.fetch(fetchUtil(params))
				}, this))
			},
			cart: function() {
				$container.html('<div id="cart">Loading...</div>')
				loadTemplates(['cart'], _.bind(function() {
					createCart()
				}, this))
			}
		})
	$(document).ready(function () {
		router = new AppRouter();
		router.bind('all', function(route, name) {
			var $el = $('#nav-' + (name || ''))
			if ($el.hasClass('active')) {
				return
			} else {
				$('.nav-item.active').removeClass('active')
				$el.addClass('active')
			}
		});
		Backbone.history.start();
	})

})(window, jQuery, Backbone)