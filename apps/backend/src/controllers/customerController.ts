import { Request, Response } from "express";
import db from "@db/db";
import { address, address_area, customer, phone_number } from "@db/schema";
import { addAddressAreaType, addAddressType, createCustomerType, deleteAddressAreaType, deleteAddressType, deleteCustomerType, editAddressType, editCustomerType, getAddressType, getCustomerType, settleBalanceType } from "@type/api/customer";
import { eq, and } from "drizzle-orm";

const createCustomer = async (req: Request, res: Response) => {

  const createCustomerTypeAnswer = createCustomerType.safeParse(req.body);

  if (!createCustomerTypeAnswer.success){
    return res.status(400).json({success: false, message: "Input fields are not correct", error: createCustomerTypeAnswer.error.flatten()})
  }

  try {
    await db.transaction(async (tx) => {

      const tCustomer = await tx.insert(customer).values({
        name: createCustomerTypeAnswer.data.name,
        balance: createCustomerTypeAnswer.data.balance,
        profileUrl: createCustomerTypeAnswer.data.profileUrl
      }).returning({ id: customer.id });

      const numberswithPrimary = createCustomerTypeAnswer.data.phone_numbers.filter((phone_number) => phone_number.isPrimary);

      const primaryPhoneIndex = createCustomerTypeAnswer.data.phone_numbers.findIndex((phone_number) => phone_number.isPrimary);

      if(numberswithPrimary.length !== 1 && createCustomerTypeAnswer.data.phone_numbers.length > 0){
        createCustomerTypeAnswer.data.phone_numbers.forEach((phone_number) => {
          phone_number.isPrimary = false;
        })
        if (primaryPhoneIndex !== -1) {
          createCustomerTypeAnswer.data.phone_numbers[primaryPhoneIndex].isPrimary = true;
        } else {
          createCustomerTypeAnswer.data.phone_numbers[0].isPrimary = true;
        }
      }

      await tx.insert(phone_number).values(
        createCustomerTypeAnswer.data.phone_numbers.map((phone_number) => {
          return {
            customer_id: tCustomer[0].id,
            phone_number: phone_number.phone_number,
            country_code: phone_number.country_code,
            isPrimary: phone_number.isPrimary,
            whatsappChatId: phone_number.whatsappChatId
          };
        })
      )

      const addressWithPrimary = createCustomerTypeAnswer.data.addresses.filter((address) => address.isPrimary);

      const primaryAddressIndex = createCustomerTypeAnswer.data.addresses.findIndex((address) => address.isPrimary);

      if(addressWithPrimary.length !== 1 && createCustomerTypeAnswer.data.addresses.length > 0){
        createCustomerTypeAnswer.data.addresses.forEach((address) => {
          address.isPrimary = false;
        })
        if (primaryPhoneIndex !== -1) {
          createCustomerTypeAnswer.data.addresses[primaryAddressIndex].isPrimary = true;
        } else {
          createCustomerTypeAnswer.data.addresses[0].isPrimary = true;
        }
      }

      if(createCustomerTypeAnswer.data.addresses.length > 0){
        await tx.insert(address).values(
          createCustomerTypeAnswer.data.addresses.map((address) => {
            return {
              customer_id: tCustomer[0].id,
              house_number: address.house_number,
              address_area_id: address.address_area_id,
              address: address.address,
              city: address.city,
              state: address.state,
              isPrimary: address.isPrimary,
              latitude: address.cordinates?.latitude ?? undefined,
              longitude: address.cordinates?.longitude ?? undefined
            }
          })
        )
      }
    })
    
    return res.status(200).json({success: true, message: "Customer created successfully"});
  } catch (error: any) {
    return res.status(400).json({success: false, message: "Unable to create customer", error: error.message ? error.message : error});
  }
}

const addAddressArea = async (req: Request, res: Response) => {
  const addAddressAreaTypeAnswer = addAddressAreaType.safeParse(req.body);

  if (!addAddressAreaTypeAnswer.success){
    return res.status(400).json({success: false, message: "Input fields are not correct", error: addAddressAreaTypeAnswer.error?.flatten()})
  }

  try {

    const allAreas = await db.query.address_area.findMany({
      columns: {
        area: true
      }
    });

    const areaExists = allAreas.find((area) => (area.area).toLowerCase() === (addAddressAreaTypeAnswer.data.area).toLowerCase());

    if(areaExists){
      return res.status(400).json({success: false, message: "Area already exists"});
    }

    await db.insert(address_area).values({
      area: addAddressAreaTypeAnswer.data.area
    });

    return res.status(200).json({success: true, message: "Address Area added successfully"});
  } catch (error: any) {
    return res.status(400).json({success: false, message: "Unable to add Address Area", error: error.message ? error.message : error});
  }
}

const deleteAddressArea = async (req: Request, res: Response) => {
  const deleteAddressAreaTypeAnswer = deleteAddressAreaType.safeParse(req.body);

  if (!deleteAddressAreaTypeAnswer.success){
    return res.status(400).json({success: false, message: "Input fields are not correct", error: deleteAddressAreaTypeAnswer.error?.flatten()})
  }

  try {

    const oldArea = await db.query.address_area.findFirst({
      where: (address_area, { eq }) => eq(address_area.id, deleteAddressAreaTypeAnswer.data.address_area_id),
      with: {
        addresses: {
          limit: 1
        }
      }
    })

    if(!oldArea){
      return res.status(400).json({success: false, message: "Area not found"});
    }

    if(oldArea.addresses.length > 0){
      return res.status(400).json({success: false, message: "Area is linked to Address, Cannot Delete!"});
    }

    await db.delete(address_area).where(eq(address_area.id, deleteAddressAreaTypeAnswer.data.address_area_id));

    return res.status(200).json({success: true, message: "Address Area deleted successfully"});
  } catch (error: any) {
    return res.status(400).json({success: false, message: "Unable to delete Address Area", error: error.message ? error.message : error});
  }
}

const getAllAddressAreas = async (_req: Request, res: Response) => {

  try {
    const areas = await db.query.address_area.findMany({
      columns: {
        id: true,
        area: true
      }
    });

    return res.status(200).json({success: true, message: "Address Areas Found", data: areas});
  } catch (error: any) {
    return res.status(400).json({success: false, message: "Unable to get Address Areas", error: error.message ? error.message : error});
  }
}

const getAllAddresses = async (_req: Request, res: Response) => {
  try {

    const allAddresses = await db.transaction(async (tx) => {
      return await tx.query.address.findMany({
        columns: {
          address_area_id: false,
          latitude: false,
          longitude: false,
          state: false,
          customer_id: false
        },
        with: {
          customer: {
            columns: {
              id: true,
              name: true
            }
          },
          address_area: {
            columns: {
              area: true,
              id: true
            }
          }
        }
      })
    })

    return res.status(200).json({success: true, message: "All Addresses fetched!", data: allAddresses});
  } catch (error: any) {
    return res.status(400).json({success: false, message: "Unable to fetch addresses", error: error.message ? error.message : error});
  }
}

const getAddress = async (req: Request, res: Response) => {
  const getAddressTypeAnswer = getAddressType.safeParse(req.query);

  if (!getAddressTypeAnswer.success){
    return res.status(400).json({success: false, message: "Input fields are not correct", error: getAddressTypeAnswer.error?.flatten()})
  }

  try {

    const foundAddress = await db.transaction(async (tx) => {
      const txAddress = await tx.query.address.findFirst({
        columns: {
          address_area_id: false,
          customer_id: false
        },
        where: (address, { eq }) => eq(address.id, getAddressTypeAnswer.data.address_id),
        with: {
          orders: {
            columns: {
              id: true,
              total_order_amount: true,
              status: true,
              payment_status: true,
              delivery_date: true,
              created_at: true
            },
            orderBy: (address, { desc }) => [desc(address.created_at)]
          },
          address_area: {
            columns: {
              id: true,
              area: true
            }
          },
          customer: {
            columns: {
              id: true,
              name: true
            }
          }
        }
      })
      
      if (!txAddress) {
        throw new Error("Address Not Found");
      }

      return txAddress;
    })

    return res.status(200).json({success: true, message: "Address found!", data: foundAddress});
  } catch (error: any) {
    return res.status(400).json({success: false, message: "Unable to find address", error: error.message ? error.message : error});
  }  
}

const addAddress = async (req: Request, res: Response) => {
  const addAddressTypeAnswer = addAddressType.safeParse(req.body);

  if (!addAddressTypeAnswer.success){
    return res.status(400).json({success: false, message: "Input fields are not correct", error: addAddressTypeAnswer.error?.flatten()})
  }

  try {

    await db.transaction(async (tx) => {

      if(addAddressTypeAnswer.data.isPrimary == true){
        await tx
          .update(address)
          .set({ isPrimary: false })
          .where(
            and(
              eq(address.customer_id, addAddressTypeAnswer.data.customer_id),
              eq(address.isPrimary, true)
            )
          );
      } else {
        // check if there is any primary address, if not then make this one primary

        const foundPrimaryAddress = await tx.query.address.findFirst({
          where: (address, { eq, and }) => and(eq(address.customer_id, addAddressTypeAnswer.data.customer_id), eq(address.isPrimary, true)),
          columns: {
            isPrimary: true
          }
        })

        if(!foundPrimaryAddress){
          addAddressTypeAnswer.data.isPrimary = true
        }
      }

      await tx.insert(address).values({
        customer_id: addAddressTypeAnswer.data.customer_id,
        house_number: addAddressTypeAnswer.data.house_number,
        address: addAddressTypeAnswer.data.address,
        address_area_id: addAddressTypeAnswer.data.address_area_id,
        city: addAddressTypeAnswer.data.city,
        state: addAddressTypeAnswer.data.state,
        isPrimary: addAddressTypeAnswer.data.isPrimary,
        latitude: addAddressTypeAnswer.data.cordinates?.latitude,
        longitude: addAddressTypeAnswer.data.cordinates?.longitude
      });;      
    })


    return res.status(200).json({success: true, message: "Address added successfully"});
  } catch (error: any) {
    return res.status(400).json({success: false, message: "Unable to add address", error: error.message ? error.message : error});
  }
}

const editAddress = async (req: Request, res: Response) => {
  const editAddressTypeAnswer = editAddressType.safeParse(req.body);

  if (!editAddressTypeAnswer.success){
    return res.status(400).json({success: false, message: "Input fields are not correct", error: editAddressTypeAnswer.error?.flatten()})
  }

  try {
    
    await db.transaction(async (tx) => {
      if(editAddressTypeAnswer.data.isPrimary == true){
        await tx
          .update(address)
          .set({ isPrimary: false })
          .where(
            and(
              eq(address.customer_id, editAddressTypeAnswer.data.customer_id),
              eq(address.isPrimary, true)
            )
          );
      } else if (editAddressTypeAnswer.data.isPrimary == false){
        // check if address to be updated is primary, if yes then throw error
        
        const foundAddress = await tx.query.address.findFirst({
          where: (address, { eq }) => eq(address.id, editAddressTypeAnswer.data.address_id),
          columns: {
            isPrimary: true
          }
        })

        if(!foundAddress){
          throw new Error("Address not found");
        }

        if(foundAddress.isPrimary){
          throw new Error("Primary Address cannot be made non-primary");
        }
      }


      await tx.update(address).set({
        house_number: editAddressTypeAnswer.data.house_number,
        address: editAddressTypeAnswer.data.address,
        address_area_id: editAddressTypeAnswer.data.address_area_id,
        city: editAddressTypeAnswer.data.city,
        state: editAddressTypeAnswer.data.state,
        isPrimary: editAddressTypeAnswer.data.isPrimary,
        latitude: editAddressTypeAnswer.data.cordinates?.latitude,
        longitude: editAddressTypeAnswer.data.cordinates?.longitude
      }).where(eq(address.id, editAddressTypeAnswer.data.address_id));
    })

    return res.status(200).json({success: true, message: "Address updated successfully"});
  } catch (error: any) {
    return res.status(400).json({success: false, message: "Unable to update address", error: error.message ? error.message : error});
  }
}

const deleteAddress = async (req: Request, res: Response) => {
  const deleteAddressTypeAnswer = deleteAddressType.safeParse(req.body);

  if (!deleteAddressTypeAnswer.success){
    return res.status(400).json({success: false, message: "Input fields are not correct", error: deleteAddressTypeAnswer.error?.flatten()})
  }

  try {
    await db.transaction(async (tx) => {
      const foundAddress = await tx.query.address.findFirst({
        where: (address, { eq }) => eq(address.id, deleteAddressTypeAnswer.data.address_id),
        columns: {
          isPrimary: true,
          customer_id: true
        },
        with: {
          orders: {
            columns: {
              id: true
            },
            limit: 1
          }
        }
      })

      if(!foundAddress){
        throw new Error("Address not found");
      }

      if(foundAddress.orders.length > 0){
        throw new Error("Address Linked to Orders, Cannot Delete!")
      }

      if(foundAddress.isPrimary){
        // try to find another address and make it primary
        const nonPrimaryAddress = await tx.query.address.findMany({
          where: (address, { eq }) => eq(address.isPrimary, false),
          columns: {
            id: true,
          }
        });
        if(nonPrimaryAddress.length > 0){
          await tx
            .update(address)
            .set({ isPrimary: true })
            .where(eq(address.id, nonPrimaryAddress[0].id));
        }

      }

      await tx.delete(address).where(eq(address.id, deleteAddressTypeAnswer.data.address_id));
    });

    return res.status(200).json({success: true, message: "Address deleted successfully"});
  } catch (error: any) {
    return res.status(400).json({success: false, message: "Unable to delete address", error: error.message ? error.message : error});
  }
}

const editCustomer = async (req: Request, res: Response) => {
  const editCustomerTypeAnswer = editCustomerType.safeParse(req.body);

  if (!editCustomerTypeAnswer.success){
    return res.status(400).json({success: false, message: "Input fields are not correct", error: editCustomerTypeAnswer.error?.flatten()})
  }

  try {
    
    await db.transaction(async (tx) => {
      const tCustomer = await tx.select({id: customer.id}).from(customer).where(eq(customer.id, editCustomerTypeAnswer.data.customer_id));

      if(tCustomer.length === 0){
        throw new Error("Customer not found");
      }

      await tx.update(customer).set({
        name: editCustomerTypeAnswer.data.name,
        profileUrl: editCustomerTypeAnswer.data.profileUrl
      }).where(eq(customer.id, tCustomer[0].id));

    })

    return res.status(200).json({success: true, message: "Customer updated successfully"});
  } catch (error: any) {
    return res.status(400).json({success: false, message: "Unable to update customer", error: error.message ? error.message : error});
  }
};

const settleBalance = async (req: Request, res: Response) => {
  const settleBalanceTypeAnswer = settleBalanceType.safeParse(req.body);

  if (!settleBalanceTypeAnswer.success){
    return res.status(400).json({success: false, message: "Input fields are not correct", error: settleBalanceTypeAnswer.error?.flatten()})
  }

  try {
    
    await db.transaction(async (tx) => {
      const tCustomer = await tx.select({id: customer.id, balance: customer.balance}).from(customer).where(eq(customer.id, settleBalanceTypeAnswer.data.customer_id));

      if(tCustomer.length === 0){
        throw new Error("Customer not found");
      }

      if(!tCustomer[0].balance){
        tCustomer[0].balance = "0.00";
      }

      const newBalance = settleBalanceTypeAnswer.data.operation == "add" 
        ? parseFloat(parseFloat(tCustomer[0].balance).toFixed(2)) + settleBalanceTypeAnswer.data.amount 
        : parseFloat(parseFloat(tCustomer[0].balance).toFixed(2)) - settleBalanceTypeAnswer.data.amount;

      await tx.update(customer).set({
        balance: newBalance.toFixed(2)
      }).where(eq(customer.id, tCustomer[0].id));
    })

    return res.status(200).json({success: true, message: "Balance updated successfully"});
  } catch (error: any) {
    return res.status(400).json({success: false, message: "Unable to update balance", error: error.message ? error.message : error});
  }
}

const getCustomer = async (req: Request, res: Response) => {

  const getCustomerTypeAnswer = getCustomerType.safeParse(req.query);

  if (!getCustomerTypeAnswer.success){
    return res.status(400).json({success: false, message: "Input fields are not correct", error: getCustomerTypeAnswer.error?.flatten()})
  }

  try {

    let customer_id = getCustomerTypeAnswer.data.customer_id;
    let phone_no = getCustomerTypeAnswer.data.phone_number;

    if(phone_no){
      let phone_number_customer = await db.query.phone_number.findFirst({
        where: (phone_number, { eq }) => eq(phone_number.phone_number, phone_no),
        columns: {
          customer_id: true
        }
      })
      if(!phone_number_customer?.customer_id) return res.status(400).json({success: false, message: "Customer not found with this phone number"})
      customer_id = phone_number_customer.customer_id;
    }
    
    if(!customer_id) return res.status(400).json({success: false, message: "Customer ID or Phone Number is required"});

    const getCustomer = await db.query.customer.findFirst({
      where: (customer, { eq }) => eq(customer.id, customer_id),
      with: {
        addresses: {
          with: {
            address_area: {
              columns: {
                area: true
              }
            }
          },
        },
        phone_numbers: {
          columns: {
            id: true,
            country_code: true,
            phone_number: true,
            isPrimary: true,
            whatsappChatId: true,
          }
        },
        orders: {
          columns: {
            id: true,
            priority: true,
            status: true,
            payment_status: true,
            total_order_amount: true,
            amount_paid: true,
            created_at: true,
          },
          orderBy: (order, { desc }) => [desc(order.created_at)],
        },
        estimates: {
          columns: {
            id: true,
            total_estimate_amount: true,
            created_at: true,
            updated_at: true
          },
          orderBy: (estimate, { desc }) => [desc(estimate.created_at)],
        }
      },
      columns: {
        total_order_value: false
      }
    })
    getCustomer?.addresses
    if(!getCustomer){
      return res.status(400).json({success: false, message: "Customer not found"});
    }

    return res.status(200).json({success: true, message: "Customer fetched!", data: getCustomer});
  } catch (error: any) {
    return res.status(400).json({success: false, message: "Unable to get customer", error: error.message ? error.message : error});
  }
}

const deleteCustomer = async (req: Request, res: Response) => {
  const deleteCustomerTypeAnswer = deleteCustomerType.safeParse(req.body);

  if (!deleteCustomerTypeAnswer.success){
    return res.status(400).json({success: false, message: "Input fields are not correct", error: deleteCustomerTypeAnswer.error?.flatten()})
  }

  try {
    await db.transaction(async (tx) => {

      const tCustomer = await tx.query.customer.findFirst({
        where: (customer, { eq }) => eq(customer.id, deleteCustomerTypeAnswer.data.customer_id),
        with: {
          orders: {
            where: (order, { or, isNotNull }) => or(
              isNotNull(order.architect_id),
              isNotNull(order.carpanter_id)
            ),
            limit: 1,
            columns: {
              id: true
            }
          }
        },
        columns: {
          id: true,
          balance: true
        }
      })
      
      if(!tCustomer){
        throw new Error("Customer not found");
      }
      
      if(tCustomer.balance && parseFloat(parseFloat(tCustomer.balance).toFixed(2)) !== 0.00){
        throw new Error("Customer has balance pending, Settle Balance first!")
      }

      if(tCustomer.orders.length > 0){
        throw new Error("Customer has orders which are linked to Architect or Carpanters, cannot delete Customer!")
      }
      
      await tx.delete(customer).where(eq(customer.id, tCustomer.id));
    });

    return res.status(200).json({success: true, message: "Customer deleted successfully"});
  } catch (error: any) {
    return res.status(400).json({success: false, message: "Unable to delete customer", error: error.message ? error.message : error});
  }
}

const getAllCustomers = async (_req: Request, res: Response) => {

  try {
    const customers = await db.query.customer.findMany({
      columns: {
        id: true,
        name: true,
        balance: true,
      },
      with: {
        addresses: {
          with: {
            address_area: {
              columns: {
                area: true
              }
            }
          },
          columns: {
            house_number: true,
          },
          where: (address, { eq }) => eq(address.isPrimary, true),
          limit: 1
        },
        phone_numbers: {
          columns: {
            phone_number: true
          },
          where: (phone_number, { eq }) => eq(phone_number.isPrimary, true),
          limit: 1
        }
      },
      orderBy: (customer, { desc }) => [desc(customer.balance)],
    });

    return res.status(200).json({success: true, message: "All Customers fetched", data: customers});
  } catch (error: any) {
    return res.status(400).json({success: false, message: "Unable to fetch customers", error: error.message ? error.message : error});
  }
}

export {
  createCustomer,
  getAllAddresses,
  getAddress,
  addAddress,
  deleteAddressArea,
  editAddress,
  deleteAddress,
  addAddressArea,
  getAllAddressAreas,
  editCustomer,
  settleBalance,
  getCustomer,
  deleteCustomer,
  getAllCustomers,
}