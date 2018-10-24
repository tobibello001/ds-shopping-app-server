/**
 * OrderController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
const Nexmo = require('nexmo')
const nodemailer = require('nodemailer')

module.exports = {
  create: {
    inputs: {
      firstName: {
        type: 'string'
      },
      lastName: {
        type: 'string'
      },
      address: {
        type: 'string'
      },
      email: {
        type: 'string'
      },
      phoneNumber: {
        type: 'string'
      },
      cart: {
        type: 'ref'
      }
    },
    exits: {
      success: {
        outputExample: {
          success: true
        }
      }
    },
    fn: async (inputs, exits) => {
      const { firstName, lastName, address, email, phoneNumber } = inputs
      try {
        let createdOrder = Order.create({
          firstName: firstName,
          lastName: lastName,
          address: address,
          email: email,
          phoneNumber: phoneNumber,
        }).fetch()
        let createdOrderItems = inputs.cart.map(cartItem => {
          return OrderItem.create({
            quantity: cartItem.quantity,
            basePrice: cartItem.basePrice,
            totalPrice: cartItem.totalPrice,
            product: cartItem.product.id,
          }).fetch()
        })


        createdOrderId = (await createdOrder).id
        let createdOrderItemsId = []
        for (let i = 0; i < createdOrderItems.length; i++) {
          createdOrderItemsId.push((await createdOrderItems[i]).id)
        }
        await Order.addToCollection(createdOrderId, 'items').members(createdOrderItemsId)
        createdOrderItemsId.forEach(async itemId => {
          await OrderItem.update({ id: itemId }).set({ order: createdOrderId })
        })
        exits.success({ success: true })
      } catch (e) {
        return exits.error(e)
      }

      //Construct Message
      const orders = inputs.cart.reduce((message, item) => {
        message += `${item.quantity} - ${item.product.title}  ${item.totalPrice}\n`
        return message
      }, '')
      const message =
        `Hello ${firstName} ${lastName},\nYour order has been confirmed:\n${orders}`
      const htmlMessage = `<p>${message}</p>`.replace('\n','<br>')

      // Send Email
      const transporter = nodemailer.createTransport(sails.config.emailTransportConfig)
      let mailOptions = {
        from: 'DS Shopping',
        to: email,
        subject: 'Order Confirmation',
        text: message,
        html: htmlMessage
      }
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          return console.log(error)
        }
        console.log('Message sent: %s', info.messageId)
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info))
      })

      // Send SMS
      const textMessagingService = new Nexmo({
        apiKey: '577d27b2',
        apiSecret: '5qNy5hsuGj8QUFKu'
      })
      textMessagingService.message.sendSms('DS Shopping', phoneNumber, message)
    }
  }
}
